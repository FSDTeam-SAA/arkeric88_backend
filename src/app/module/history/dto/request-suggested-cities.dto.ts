import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { VelariIntakeDto } from './velari-intake.dto';

export class RequestSuggestedCitiesDto {
  @ApiPropertyOptional({
    description:
      'Validated 11-step Velari intake. Preferred over questions_answers.',
    type: VelariIntakeDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VelariIntakeDto)
  intake?: VelariIntakeDto;

  @ApiPropertyOptional({
    description:
      'Deprecated legacy questionnaire payload. Requests using it are rejected with 422.',
    example: {
      selected_archetype: 'burned_out_achiever',
      archetype_answers: {
        burnout_recovery_priority: 'Restorative sleep',
        burnout_current_pressure: 'I am always switched on',
        burnout_support_style: 'Private and self-paced',
        burnout_social_boundary: 'As little as possible',
      },
      energy_level: 'Low',
      travel_style: 'Couple (An intimate shared experience)',
      trip_organization: 'Loosely planned',
      activity_restrictions: ['Intense hiking or climbing'],
      preferred_environments: ['Mountains', 'Nature', 'Ocean'],
      birthdate: '2003-07-04',
      total_trip_budget: 10000,
      trip_length_days: 5,
    },
  })
  @IsOptional()
  @IsObject()
  questions_answers?: Record<string, unknown>;

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
