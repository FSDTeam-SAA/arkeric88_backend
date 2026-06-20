import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JourneyService } from './journey.service';
import { JourneyController } from './journey.controller';
import { Journey, JourneySchema } from './entity/journey.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Journey.name, schema: JourneySchema },
    ]),
  ],
  controllers: [JourneyController],
  providers: [JourneyService],
  exports: [JourneyService],
})
export class JourneyModule {}