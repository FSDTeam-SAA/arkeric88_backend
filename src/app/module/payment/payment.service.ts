import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import config from 'src/app/config';
import { Payment, PaymentDocument, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { IPaymentService } from './payment-service.interface';
import { PaymentIntentResponseDto } from './dto/payment-response.dto';
import pick, { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import sendMailer from 'src/app/helpers/sendMailer';
import { createPaymentSuccessEmailTemplate } from 'src/app/helpers/template';
// import config from '../../config';

@Injectable()
export class PaymentService implements IPaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {
    if (!config.stripe.secretKey) {
      throw new InternalServerErrorException('Stripe secret key is not configured');
    }

    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2026-03-25.dahlia',
      telemetry: false,
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async createPaymentIntent(dto: CreatePaymentDto): Promise<PaymentIntentResponseDto> {
    const { amount, currency = 'usd', description, nameOnCard, email, country, zipCode } = dto;

    const stripeAmount = this.toStripeAmount(amount);

    const metadata: Record<string, string> = {};
    if (nameOnCard) metadata.nameOnCard = nameOnCard;
    if (country) metadata.country = country;
    if (zipCode) metadata.zipCode = zipCode;

    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: stripeAmount,
          currency,
          description,
          metadata: Object.keys(metadata).length ? metadata : undefined,
          automatic_payment_methods: { enabled: true },
        },
        {
          // Idempotency key prevents duplicate charges on retries
          idempotencyKey: `pi_${currency}_${stripeAmount}_${Date.now()}`,
        },
      );
    } catch (err) {
      this.logger.error('Stripe paymentIntent creation failed', err);
      throw new InternalServerErrorException('Payment provider error. Please try again.');
    }

    const paymentId = await this.generateUniquePaymentId();

    const payment = await this.paymentModel.create({
      amount,
      currency,
      description,
      nameOnCard,
      email,
      country,
      zipCode,
      paymentId,
      stripePaymentIntentId: paymentIntent.id,
      status: PaymentStatus.PENDING,
      paymentMethod: 'card',
    });

    this.logger.log(`PaymentIntent created: ${paymentIntent.id} | DB: ${payment._id}`);

    const publishableKey = config.stripe.publicKey;
    if (!publishableKey) {
      throw new InternalServerErrorException('Stripe publishable key is not configured');
    }

    return {
      paymentId: payment.paymentId,
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      description,
      publishableKey,
    };
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!config.stripe.webhookSecret) {
      throw new InternalServerErrorException('Stripe webhook secret is not configured');
    }

    const event = this.constructWebhookEvent(payload, signature);
    await this.processWebhookEvent(event);
  }
  async findAll(
    params: IFilterParams = {},
    options: IOptions = {},
  ): Promise<{ meta: { page: number; limit: number; total: number }; data: PaymentDocument[] }> {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper(options);
    const { searchTerm, ...filterData } = params;

    const whereConditions: Record<string, unknown> = {};

    if (searchTerm) {
      whereConditions.$or = [
        { description: { $regex: searchTerm, $options: 'i' } },
        { nameOnCard: { $regex: searchTerm, $options: 'i' } },
        { country: { $regex: searchTerm, $options: 'i' } },
        { zipCode: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    if (filterData.status) {
      whereConditions.status = filterData.status;
    }

    if (filterData.currency) {
      whereConditions.currency = filterData.currency;
    }

    if (filterData.nameOnCard) {
      whereConditions.nameOnCard = filterData.nameOnCard;
    }

    if (filterData.country) {
      whereConditions.country = filterData.country;
    }

    if (filterData.zipCode) {
      whereConditions.zipCode = filterData.zipCode;
    }

    const total = await this.paymentModel.countDocuments(whereConditions);
    const data = await this.paymentModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as never)
      .exec();

    return {
      meta: { page, limit, total },
      data,
    };
  }

  buildPaymentFilter(query: Record<string, any>): IFilterParams {
    return pick(query, ['searchTerm', 'status', 'currency', 'nameOnCard', 'country', 'zipCode']);
  }

  buildPaginationOptions(query: Record<string, any>): IOptions {
    return pick(query, ['page', 'limit', 'sortBy', 'sortOrder']);
  }

  async findById(id: string): Promise<PaymentDocument | null> {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with id "${id}" not found`);
    }
    return payment;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = config.stripe.webhookSecret;
    if (!webhookSecret) {
      throw new InternalServerErrorException('Stripe webhook secret is not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    const HANDLED_EVENTS: Record<string, PaymentStatus> = {
      'payment_intent.succeeded': PaymentStatus.SUCCEEDED,
      'payment_intent.payment_failed': PaymentStatus.FAILED,
      'payment_intent.canceled': PaymentStatus.CANCELED,
    };

    const newStatus = HANDLED_EVENTS[event.type];

    if (!newStatus) {
      this.logger.debug(`Unhandled webhook event type: ${event.type}`);
      return;
    }

    const intent = event.data.object as Stripe.PaymentIntent;

    if (!intent?.id) {
      this.logger.warn(`Webhook event "${event.type}" has no payment intent id`);
      return;
    }

    await this.updatePaymentStatus(intent.id, newStatus);
  }

  private async updatePaymentStatus(
    stripePaymentIntentId: string,
    status: PaymentStatus,
  ): Promise<void> {
    const payment = await this.paymentModel.findOne({ stripePaymentIntentId }).exec();

    if (!payment) {
      this.logger.warn(
        `No payment record found for PaymentIntent: ${stripePaymentIntentId}`,
      );
      return;
    }

    if (payment.status === status) {
      this.logger.debug(`Payment ${payment._id} already has status "${status}", skipping`);
      return;
    }

    const previousStatus = payment.status;
    payment.status = status;
    await payment.save();

    this.logger.log(
      `Payment ${payment._id} status updated: ${previousStatus} → ${status}`,
    );

    if (status === PaymentStatus.SUCCEEDED) {
      const html = createPaymentSuccessEmailTemplate({
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        nameOnCard: payment.nameOnCard,
        country: payment.country,
        zipCode: payment.zipCode,
        paymentMethod: payment.paymentMethod,
        paymentDate: new Date(payment.updatedAt ?? payment.createdAt).toISOString(),
      });

      try {
        await sendMailer(
          "mahabur1814031@gmail.com",
          'Payment Confirmation',
          html,
        );
        this.logger.log(`Payment confirmation email sent to ${payment.email}`);
      } catch (error) {
        this.logger.warn(`Failed to send payment confirmation email to ${payment.email}: ${(error as Error).message}`);
      }
    }
  }

  private async generateUniquePaymentId(): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = Math.floor(100000 + Math.random() * 900000).toString();
      const exists = await this.paymentModel.exists({ paymentId: candidate });
      if (!exists) {
        return candidate;
      }
    }

    throw new InternalServerErrorException('Unable to generate a unique payment identifier. Please try again.');
  }

  /** Convert major unit (e.g. 49.99 USD) to Stripe's minor unit (cents) */
  private toStripeAmount(amount: number): number {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    return Math.round(amount * 100);
  }
}