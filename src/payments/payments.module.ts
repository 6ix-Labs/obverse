import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payments.schema';
import { PaymentRepository } from './payments.repository';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { PaymentLinksModule } from 'src/payment-links/payment-links.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    TransactionsModule,
    forwardRef(() => PaymentLinksModule),
    forwardRef(() => ApiKeysModule), // Import to use OptionalApiKeyGuard
    forwardRef(() => InvoicesModule),
  ],
  providers: [PaymentsService, PaymentRepository],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentRepository],
})
export class PaymentsModule { }
