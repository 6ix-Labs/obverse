import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payments.schema';
import { PaymentRepository } from './payments.repository';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { PaymentLinksModule } from 'src/payment-links/payment-links.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    TransactionsModule,
    PaymentLinksModule,
  ],
  providers: [PaymentsService, PaymentRepository],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentRepository],
})
export class PaymentsModule {}
