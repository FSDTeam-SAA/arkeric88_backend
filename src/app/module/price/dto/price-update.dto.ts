import { PartialType } from '@nestjs/swagger';
import { CreatePriceDto } from './price-create.dto';

export class UpdatePriceDto extends PartialType(CreatePriceDto) {}