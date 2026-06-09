import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { HistoryRecord, HistorySchema } from './entity/history.entity';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HistoryRecord.name, schema: HistorySchema },
    ]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}