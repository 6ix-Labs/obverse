import { Module } from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController } from './payment-links.controller';
import { OGImageService } from './og-image.service';
import { OGTemplateService } from './og-template.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentLink, PaymentLinkSchema } from './schemas/payment-links.schema';
import { PaymentlinksRepository } from './payment-links.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentLink.name, schema: PaymentLinkSchema },
    ]),
  ],
  providers: [
    PaymentLinksService,
    PaymentlinksRepository,
    OGImageService,
    OGTemplateService,
  ],
  controllers: [PaymentLinksController],
  exports: [PaymentLinksService, PaymentlinksRepository],
})
export class PaymentLinksModule {}
