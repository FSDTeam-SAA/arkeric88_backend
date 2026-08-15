import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
    example: 'retreat_118',
    description: 'The exact property_id returned by the suggested-city response.',
  })
  @IsString()
  @IsNotEmpty()
  property_id: string;
}
