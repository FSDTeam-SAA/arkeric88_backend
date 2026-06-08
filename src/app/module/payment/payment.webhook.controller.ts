import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentService } from './payment.service';

/**
 * Stripe Webhook Controller
 *
 * IMPORTANT — Raw body requirement:
 * Stripe webhook signature verification requires the RAW request body (Buffer).
 * You must configure the /webhook route to bypass the global JSON body parser.
 *
 * In main.ts, register the raw body parser BEFORE the global JSON parser:
 *
 * ```ts
 * app.use(
 *   '/webhook',
 *   express.raw({ type: 'application/json' }),
 * );
 * app.use(express.json());
 * ```
 *
 * Or, if using the NestJS built-in body parser, set rawBody: true in main.ts:
 * ```ts
 * const app = await NestFactory.create(AppModule, { rawBody: true });
 * ```
 * and then use `@RawBody() rawBody: Buffer` with the `RawBodyRequest` type.
 */
@ApiExcludeController()
@Controller('webhook')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    // req.body is a Buffer when raw body middleware is applied to this route
    const payload = req.body as Buffer;
    await this.paymentService.handleStripeWebhook(payload, signature);
    return { received: true };
  }
}