import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PaymentLinksModule } from '../payment-links/payment-links.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';
import { PreviewModule } from '../preview/preview.module';

@Module({
  imports: [
    AuthModule, // For JWT authentication
    PaymentLinksModule,
    TransactionsModule,
    PaymentsModule,
    PreviewModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
