import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { Price, PriceSchema } from './entity/price.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Price.name, schema: PriceSchema },
    ]),
  ],
  controllers: [PriceController],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}