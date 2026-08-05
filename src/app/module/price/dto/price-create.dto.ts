import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({
    example: 'active',
    description: 'Status of the price',
    enum: ['active', 'inactive'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 'Boiler installation price',
    description: 'Description of the price',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'boiler',
    description: 'Payment category of the price',
  })
  @IsOptional()
  @IsString()
  paymentCategory?: string;
}