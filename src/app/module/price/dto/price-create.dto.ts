import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePriceDto {
  @ApiProperty({
    example: 100,
    description: 'Price value',
  })
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (value === '' || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  price: number;
}