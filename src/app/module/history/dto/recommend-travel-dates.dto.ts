import { OmitType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VelariIntakeDto } from './velari-intake.dto';

/**
 * The date-recommendation service receives the same step 1-10 intake as city
 * suggestions, except that a lodging budget and fixed dates are not relevant.
 */
export class RecommendTravelDatesDto extends OmitType(VelariIntakeDto, [
  'budget_per_night',
  'check_in_date',
  'check_out_date',
] as const) {
  @IsEnum(['flexible', 'month_season'])
  declare travel_timing: 'flexible' | 'month_season';

  @IsInt()
  @Min(1)
  @Max(90)
  declare trip_nights: number;

  @IsOptional()
  @IsDateString({ strict: true })
  earliest_check_in?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  latest_check_out?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  destination_id?: string;
}
