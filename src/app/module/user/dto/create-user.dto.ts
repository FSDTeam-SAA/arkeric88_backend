import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class CreateUserDto {
  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  password?: string;

  @ApiPropertyOptional({ enum: ['user', 'admin'] })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEnum(['user', 'admin'])
  role?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEnum(['male', 'female'])
  gender?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  dateOfBirth?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  otp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  otpExpiry?: Date;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  verifiedForget?: boolean;

  @ApiPropertyOptional({ enum: ['active', 'suspended'] })
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  status?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  stripeAccountId?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  tag?: string;
}
