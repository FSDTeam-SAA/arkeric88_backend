import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentIntentResponseDto } from "./dto/payment-response.dto";
import { PaymentDocument } from "./entities/payment.entity";


export interface IPaymentService {
  createPaymentIntent(dto: CreatePaymentDto, userId: string): Promise<PaymentIntentResponseDto>;
  handleStripeWebhook(payload: Buffer, signature: string): Promise<void>;
  findById(id: string): Promise<PaymentDocument | null>;
}

export const PAYMENT_SERVICE_TOKEN = 'PAYMENT_SERVICE';
