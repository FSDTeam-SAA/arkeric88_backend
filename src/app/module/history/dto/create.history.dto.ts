// ─── create-history.dto.ts ───────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

// ─── Nested DTOs ──────────────────────────────────────────────────────────────

export class UserProfileDto {
  @ApiProperty({ example: 'Leo' })
  @IsString()
  zodiacSign: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'], example: 'low' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  currentEnergy?: string;

  @ApiProperty({ example: 'Feeling burned out and mentally exhausted' })
  @IsString()
  emotionalState: string;

  @ApiProperty({ example: 'Healing, inspiration, and emotional renewal' })
  @IsString()
  seeking: string;

  @ApiPropertyOptional({ enum: ['solo', 'couple', 'family', 'group'], example: 'solo' })
  @IsOptional()
  @IsEnum(['solo', 'couple', 'family', 'group'])
  travelStyle?: string;

  @ApiPropertyOptional({ enum: ['spontaneous', 'balanced', 'well_planned'], example: 'well_planned' })
  @IsOptional()
  @IsEnum(['spontaneous', 'balanced', 'well_planned'])
  preferredPace?: string;

  @ApiProperty({ example: 1500, description: 'Budget in USD' })
  @IsNumber()
  @IsPositive()
  budget: number;

  @ApiProperty({ example: 7, description: 'Trip length in days' })
  @IsInt()
  @IsPositive()
  tripLengthDays: number;

  @ApiPropertyOptional({ type: [String], example: ['Ocean', 'Nature'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredEnvironments?: string[];
}

export class TravelMatchDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  rank: number;

  @ApiProperty({ example: 'Bali' })
  @IsString()
  destination: string;

  @ApiProperty({ example: 'Indonesia' })
  @IsString()
  country: string;

  @ApiProperty({ example: 'Bali offers the perfect balance between luxury and healing.' })
  @IsString()
  description: string;

  @ApiProperty({ example: 94, description: 'Match score as a percentage (0-100)' })
  @IsNumber()
  @Min(0)
  matchScore: number;
}

export class DayItineraryDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  day: number;

  @ApiProperty({ example: 'Arrival & Reset' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Arrive in Bali and settle into your wellness retreat...' })
  @IsString()
  description: string;
}

export class RecommendedJourneyDto {
  @ApiProperty({ example: 'Bali Wellness Escape' })
  @IsString()
  destination: string;

  @ApiProperty({ example: 'Ubud, Bali' })
  @IsString()
  homeBase: string;

  @ApiProperty({ example: "Known as Bali's spiritual heart..." })
  @IsString()
  homeBaseDescription: string;

  @ApiPropertyOptional({ example: 'Luxury wellness resort' })
  @IsOptional()
  @IsString()
  accommodationType?: string;

  @ApiPropertyOptional({ type: [String], example: ['Spa treatments', 'Yoga classes'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accommodationFeatures?: string[];

  @ApiPropertyOptional({ type: [DayItineraryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayItineraryDto)
  itinerary?: DayItineraryDto[];
}

// ─── Main DTO ─────────────────────────────────────────────────────────────────

export class CreateHistoryDto {
  @ApiPropertyOptional({ example: '665f1b2c3e4d5f6a7b8c9d0e', description: 'User ID (MongoDB ObjectId)' })
  user?: string;

  @ApiProperty({ type: UserProfileDto })
  @ValidateNested()
  @Type(() => UserProfileDto)
  userProfile: UserProfileDto;

  @ApiPropertyOptional({ type: [String], example: ['Nature', 'Wellness', 'Ocean Energy'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  travelThemes?: string[];

  @ApiPropertyOptional({ type: [TravelMatchDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravelMatchDto)
  travelMatches?: TravelMatchDto[];

  @ApiPropertyOptional({ type: RecommendedJourneyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecommendedJourneyDto)
  recommendedJourney?: RecommendedJourneyDto;

  @ApiPropertyOptional({ example: 'Leo energy shines brightest when confidence, creativity, and joy are restored.' })
  @IsOptional()
  @IsString()
  astroInsight?: string;

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'failed'], example: 'pending' })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'failed'])
  aiAnalysisStatus?: string;

  @ApiProperty({ example: 999, description: 'Payment amount in USD cents (e.g. 999 = $9.99)' })
  @IsInt()
  @Min(0)
  paymentAmount: number;

  @ApiPropertyOptional({ example: 'pi_3OxxxxxYYYY' })
  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @ApiPropertyOptional({ enum: ['unpaid', 'paid', 'refunded'], example: 'unpaid' })
  @IsOptional()
  @IsEnum(['unpaid', 'paid', 'refunded'])
  paymentStatus?: string;
}