import {
  IsNotEmpty,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentCurrency } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 49.99, description: 'Amount in major currency unit (e.g. dollars)' })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5, { message: 'Minimum payment amount is 0.50' })
  @Transform(({ value }) => parseFloat(parseFloat(value).toFixed(2)))
  amount: number;

  @ApiPropertyOptional({ enum: PaymentCurrency, default: PaymentCurrency.USD })
  @IsOptional()
  @IsEnum(PaymentCurrency, { message: 'Currency must be one of: usd, eur, gbp' })
  currency?: PaymentCurrency;

  @ApiPropertyOptional({ example: 'Premium Plan Subscription' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  nameOnCard?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  @MaxLength(320)
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @ApiPropertyOptional({ example: 'US', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a valid 2-letter ISO code (e.g. US)' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  country?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  zipCode?: string;
}