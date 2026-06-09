import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum PaymentMethod {
  CARD = 'card',
}

export enum PaymentCurrency {
  USD = 'usd',
  EUR = 'eur',
  GBP = 'gbp',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ default: PaymentCurrency.USD, enum: PaymentCurrency })
  currency: string;

  @Prop({ default: PaymentMethod.CARD, enum: PaymentMethod })
  paymentMethod: string;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  nameOnCard?: string;

  @Prop({ trim: true, lowercase: true, maxlength: 320 })
  email?: string;

  @Prop({ trim: true, uppercase: true, maxlength: 2 })
  country?: string;

  @Prop({ trim: true })
  zipCode?: string;

  @Prop({ required: true, unique: true, index: true, trim: true, minlength: 6, maxlength: 6 })
  paymentId: string;

  @Prop({ index: true, sparse: true })
  stripePaymentIntentId?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);