import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../user/entities/user.entity';

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

export enum PaymentAnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export class PaymentAnalysisRequest {
  version?: 'legacy' | 'v2';
  questions_answers?: Record<string, unknown>;
  questionnaire?: Record<string, unknown>;
  preferred_destinations?: string;
  hope_of_this_trip?: string;
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    index: true,
  })
  user?: Types.ObjectId;

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

  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
    minlength: 6,
    maxlength: 6,
  })
  paymentId: string;

  @Prop({ index: true, sparse: true })
  stripePaymentIntentId?: string;

  @Prop({
    type: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    default: [],
    _id: false,
  })
  quiz?: { question: string; answer: string }[];

  @Prop({ type: Object })
  analysisRequest?: PaymentAnalysisRequest;

  @Prop({ enum: ['legacy', 'v2'], default: 'legacy' })
  questionnaireVersion: 'legacy' | 'v2';

  @Prop({
    type: String,
    enum: PaymentAnalysisStatus,
    default: PaymentAnalysisStatus.SKIPPED,
    index: true,
  })
  analysisStatus: PaymentAnalysisStatus;

  @Prop()
  analysisError?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
