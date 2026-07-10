import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from '../payment/entities/payment.entity';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { HistoryRecord, HistorySchema } from './entity/history.entity';
import { HistoryAiClient } from './history-ai.client';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HistoryRecord.name, schema: HistorySchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService, HistoryAiClient],
  exports: [HistoryService],
})
export class HistoryModule {}
