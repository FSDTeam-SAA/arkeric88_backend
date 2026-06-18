import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

export class QuizItemDto {
  @ApiProperty({ example: 'What is 2+2?' })
  @Expose()
  question: string;

  @ApiProperty({ example: '4' })
  @Expose()
  answer: string;
}

export class PaymentIntentResponseDto {
  @ApiProperty({ description: 'Internal payment record ID' })
  @Expose()
  @Transform(({ obj }) => obj.paymentId ? String(obj.paymentId) : obj._id?.toString())
  paymentId: string;

  @ApiProperty({ description: 'Stripe client secret for frontend SDK' })
  @Expose()
  clientSecret: string;

  @ApiProperty({ description: 'Stripe PaymentIntent ID' })
  @Expose()
  paymentIntentId: string;

  @ApiProperty({ example: 49.99 })
  @Expose()
  amount: number;

  @ApiProperty({ example: 'usd' })
  @Expose()
  currency: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Stripe publishable key for frontend SDK' })
  @Expose()
  publishableKey: string;

  @ApiPropertyOptional({
    description: 'Quiz questions and answers',
    type: [QuizItemDto],
  })
  @Expose()
  @Type(() => QuizItemDto)
  quiz?: { question: string; answer: string }[];
}

export class CreatePaymentResponseDto {
  @ApiProperty({ example: 'Payment intent created successfully' })
  message: string;

  @ApiProperty({ type: PaymentIntentResponseDto })
  data: PaymentIntentResponseDto;
}