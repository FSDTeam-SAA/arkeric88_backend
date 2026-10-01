import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestTourPlanDto {
  @ApiProperty({ example: '94e7cadc-46b3-4ab0-b45a-3960a588c47b' })
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty({
    example: 'PT-AZO',
    description:
      'The exact destination_id returned by the latest suggested-city response.',
  })
  @IsString()
  @IsNotEmpty()
  destination_id: string;
}
