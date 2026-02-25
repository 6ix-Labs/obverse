import { Module } from '@nestjs/common';
import { PaymentLinksModule } from '../payment-links/payment-links.module';
import { PaymentsModule } from '../payments/payments.module';
import { PreviewModule } from '../preview/preview.module';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';

@Module({
    imports: [PaymentLinksModule, PaymentsModule, PreviewModule],
    controllers: [ShareController],
    providers: [ShareService],
})
export class ShareModule { }
