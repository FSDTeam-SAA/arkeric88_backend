import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegenerateSuggestedCitiesDto {
  @ApiProperty({ example: '435730a0-1831-46dd-bf14-515570e20114' })
  @IsString()
  @IsNotEmpty()
  session_id: string;
}
