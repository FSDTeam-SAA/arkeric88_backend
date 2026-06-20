import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

// Accepts a JSON array, a comma-separated string, or repeated form fields
// so `tags` works cleanly whether the client sends JSON or multipart/form-data.
const toArray = ({ value }: { value: unknown }) => {
  if (value === '' || value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed
        : value.split(',').map((v) => v.trim());
    } catch {
      return value.split(',').map((v) => v.trim());
    }
  }
  return value;
};

export class CreateJourneyDto {
  @ApiProperty({ example: 'Japan', description: 'Destination name shown on the card' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    type: [String],
    enum: ['calm', 'adventure', 'romantic', 'luxury', 'cultural'],
    isArray: true,
    example: ['calm', 'romantic'],
    description: 'One or more emotions this journey is matched with',
  })
  @IsNotEmpty()
  @Transform(toArray)
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(['calm', 'adventure', 'romantic', 'luxury', 'cultural'], { each: true })
  emotion: string[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Cover image upload',
  })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({
    example: 'For the calm seeker',
    description: 'Short copy shown above the destination name',
  })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  tagline?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Calm Luxury'],
    description: 'Badge tags shown on the journey card',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Lower numbers are shown first',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({
    description: 'Pin this journey to featured / sample journey lists',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '') return undefined;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return value;
  })
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEnum(['active', 'inactive'])
  status?: string;
}