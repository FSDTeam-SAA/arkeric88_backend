import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from './app/config';
import { AuthModule } from './app/module/auth/auth.module';
import { UserModule } from './app/module/user/user.module';
// import { PaymentModule } from './app/module/payment/payment.module';
// import { HistoryModule } from './app/module/history/history.module';
// import { DashboardModule } from './app/module/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(config.mongoUri as string),
    AuthModule,
    UserModule,
    // PaymentModule,
    // HistoryModule,
    // DashboardModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
