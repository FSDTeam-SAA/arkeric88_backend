import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class RequestSuggestedCitiesDto {
  @ApiProperty({
    description: 'Answers collected from the frontend questionnaire flow.',
    example: {
      todays_feeling: 'Overwhelmed',
      experience_kind: 'Deep',
      energy_level: 'Low',
      travel_style: 'Couple (An intimate shared experience)',
      trip_organization: 'Loosely planned',
      activity_restrictions: ['Intense hiking or climbing'],
      life_season: 'Building',
      preferred_environments: ['Mountains', 'Nature', 'Ocean'],
      birthdate: '2003-07-04',
      total_trip_budget: 10000,
      trip_length_days: 5,
    },
  })
  @IsObject()
  questions_answers: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'europe' })
  @IsOptional()
  @IsString()
  preferred_destinations?: string;

  @ApiPropertyOptional({ example: 'refreshment' })
  @IsOptional()
  @IsString()
  hope_of_this_trip?: string;

  @ApiProperty({
    description: 'Stripe payment intent id created by the payment module.',
    example: 'pi_3OxxxxxYYYY',
  })
  @IsString()
  @IsNotEmpty()
  payment_intent_id: string;
}
