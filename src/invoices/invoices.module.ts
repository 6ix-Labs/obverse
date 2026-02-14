import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PaymentLinksModule } from '../payment-links/payment-links.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),
        forwardRef(() => PaymentLinksModule),
        forwardRef(() => MerchantsModule),
        forwardRef(() => ApiKeysModule),
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService],
})
export class InvoicesModule { }
