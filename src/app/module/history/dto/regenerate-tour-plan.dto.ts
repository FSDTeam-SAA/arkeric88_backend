import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RegenerateTourPlanDto {
  @ApiProperty({ example: 'df247981-e317-4696-8f22-5a15e486e687' })
  @IsString()
  @IsNotEmpty()
  activity_session_id: string;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  day_to_regenerate?: number | null;

  @ApiPropertyOptional({ example: 'Prefer a quieter afternoon.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  user_instruction?: string;
}
