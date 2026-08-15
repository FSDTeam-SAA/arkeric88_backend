import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestTourPlanDto {
  @ApiProperty({ example: '94e7cadc-46b3-4ab0-b45a-3960a588c47b' })
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty({ example: 'Amalfi' })
  @IsString()
  @IsNotEmpty()
  selected_city: string;

  @ApiProperty({
    required: false,
    example: 'retreat_118',
    description: 'Exact v2 retreat property selected by the user.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  property_id?: string;
}
