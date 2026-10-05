import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegenerateSuggestedCitiesDto {
  @ApiProperty({ example: '435730a0-1831-46dd-bf14-515570e20114' })
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiPropertyOptional({ example: 'Prefer somewhere closer to home.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  user_instruction?: string;

  @ApiPropertyOptional({
    description:
      'Partial Velari intake changes. The backend merges these into the saved intake and validates the complete result.',
    example: {
      restriction_severity_mobility_accessibility: 'prefer_avoid',
    },
  })
  @IsOptional()
  @IsObject()
  intake_updates?: Record<string, unknown>;
}
