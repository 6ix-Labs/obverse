import { Module } from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController } from './payment-links.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentLink, PaymentLinkSchema } from './schemas/payment-links.schema';
import { PaymentlinksRepository } from './payment-links.repository';
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PaymentLink.name, schema: PaymentLinkSchema },
        ]),
    ],
    providers: [PaymentLinksService, PaymentlinksRepository],
    controllers: [PaymentLinksController],
    exports: [PaymentLinksService, PaymentlinksRepository],
})
export class PaymentLinksModule { }
