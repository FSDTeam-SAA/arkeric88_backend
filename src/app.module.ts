import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from './app/config';
import { AuthModule } from './app/module/auth/auth.module';
import { UserModule } from './app/module/user/user.module';
import { PaymentModule } from './app/module/payment/payment.module';
import { HistoryModule } from './app/module/history/history.module';
import { DashboardModule } from './app/module/dashboard/dashboard.module';
import { JourneyModule } from './app/module/journey/journey.module';
import { PriceModule } from './app/module/price/price.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(config.mongoUri as string),
    AuthModule,
    UserModule,
    PaymentModule,
    HistoryModule,
    DashboardModule,
    JourneyModule,
    PriceModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
