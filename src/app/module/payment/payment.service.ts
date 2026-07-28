import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import config from 'src/app/config';
import pick, { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import sendMailer from 'src/app/helpers/sendMailer';
import { createPaymentSuccessEmailTemplate } from 'src/app/helpers/template';
import { HistoryService } from '../history/history.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentIntentResponseDto } from './dto/payment-response.dto';
import { IPaymentService } from './payment-service.interface';
import {
  Payment,
  PaymentAnalysisStatus,
  PaymentDocument,
  PaymentStatus,
} from './entities/payment.entity';

@Injectable()
export class PaymentService implements IPaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly historyService: HistoryService,
  ) {
    if (!config.stripe.secretKey) {
      throw new InternalServerErrorException('Stripe secret key is not configured');
    }

    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2026-03-25.dahlia',
      telemetry: false,
    });
  }

  async createPaymentIntent(
    dto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentIntentResponseDto> {
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
          idempotencyKey: `pi_${currency}_${stripeAmount}_${Date.now()}`,
        },
      );
    } catch (err) {
      this.logger.error('Stripe paymentIntent creation failed', err);
      throw new InternalServerErrorException('Payment provider error. Please try again.');
    }

    const paymentId = await this.generateUniquePaymentId();

    const payment = await this.paymentModel.create({
      user: this.toObjectId(userId),
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
      quiz: dto.quiz ?? [],
      analysisRequest: dto.questions_answers
        ? {
            questions_answers: dto.questions_answers,
            preferred_destinations: dto.preferred_destinations,
            hope_of_this_trip: dto.hope_of_this_trip,
          }
        : undefined,
      analysisStatus: dto.questions_answers
        ? PaymentAnalysisStatus.PENDING
        : PaymentAnalysisStatus.SKIPPED,
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
      quiz: payment.quiz ?? [],
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

  private constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = config.stripe.webhookSecret;
    if (!webhookSecret) {
      throw new InternalServerErrorException('Stripe webhook secret is not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    const handledEvents: Record<string, PaymentStatus> = {
      'payment_intent.succeeded': PaymentStatus.SUCCEEDED,
      'payment_intent.payment_failed': PaymentStatus.FAILED,
      'payment_intent.canceled': PaymentStatus.CANCELED,
    };

    const newStatus = handledEvents[event.type];

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

    if (payment.status === status && !this.shouldRetryAutoAnalysis(payment, status)) {
      this.logger.debug(`Payment ${payment._id} already has status "${status}", skipping`);
      return;
    }

    const previousStatus = payment.status;
    if (payment.status !== status) {
      payment.status = status;
      await payment.save();
      this.logger.log(`Payment ${payment._id} status updated: ${previousStatus} -> ${status}`);
    }

    if (status === PaymentStatus.SUCCEEDED) {
      await this.runAutoSuggestedCityAnalysis(payment);

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

      if (payment.email) {
        try {
          await sendMailer(payment.email, 'Payment Confirmation', html);
          this.logger.log(`Payment confirmation email sent to ${payment.email}`);
        } catch (error) {
          this.logger.warn(
            `Failed to send payment confirmation email to ${payment.email}: ${
              (error as Error).message
            }`,
          );
        }
      } else {
        this.logger.warn(
          `Payment confirmation email skipped for ${payment.paymentId}: missing payer email`,
        );
      }
    }
  }

  private shouldRetryAutoAnalysis(
    payment: PaymentDocument,
    status: PaymentStatus,
  ): boolean {
    return (
      status === PaymentStatus.SUCCEEDED &&
      Boolean(payment.user) &&
      Boolean(payment.analysisRequest?.questions_answers) &&
      [PaymentAnalysisStatus.PENDING, PaymentAnalysisStatus.FAILED].includes(
        payment.analysisStatus,
      )
    );
  }

  private async runAutoSuggestedCityAnalysis(payment: PaymentDocument): Promise<void> {
    if (!payment.user || !payment.analysisRequest?.questions_answers) {
      this.logger.debug(
        `Skipping auto AI trigger for payment ${payment._id}: missing user or questionnaire data`,
      );

      if (payment.analysisStatus !== PaymentAnalysisStatus.SKIPPED) {
        payment.analysisStatus = PaymentAnalysisStatus.SKIPPED;
        payment.analysisError = 'Missing user or questionnaire data for auto analysis';
        await payment.save();
      }

      return;
    }

    if (
      ![PaymentAnalysisStatus.PENDING, PaymentAnalysisStatus.FAILED].includes(
        payment.analysisStatus,
      )
    ) {
      return;
    }

    payment.analysisStatus = PaymentAnalysisStatus.PROCESSING;
    payment.analysisError = undefined;
    await payment.save();

    try {
      await this.historyService.generateSuggestedCitiesFromPayment(payment);
      payment.analysisStatus = PaymentAnalysisStatus.COMPLETED;
      await payment.save();
      this.logger.log(`Auto suggested-city analysis completed for payment ${payment._id}`);
    } catch (error) {
      payment.analysisStatus = PaymentAnalysisStatus.FAILED;
      payment.analysisError =
        error instanceof Error ? error.message : 'Suggested city analysis failed';
      await payment.save();
      this.logger.error(
        `Auto suggested-city analysis failed for payment ${payment._id}`,
        error as Error,
      );
      throw error;
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

    throw new InternalServerErrorException(
      'Unable to generate a unique payment identifier. Please try again.',
    );
  }

  private toStripeAmount(amount: number): number {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    return Math.round(amount * 100);
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    return new Types.ObjectId(id);
  }
}
