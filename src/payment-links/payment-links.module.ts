import { Module, forwardRef } from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController } from './payment-links.controller';
import { OGImageService } from './og-image.service';
import { OGTemplateService } from './og-template.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentLink, PaymentLinkSchema } from './schemas/payment-links.schema';
import { PaymentlinksRepository } from './payment-links.repository';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentLink.name, schema: PaymentLinkSchema },
    ]),
    forwardRef(() => ApiKeysModule), // Import to use ApiKeyGuard
    AuthModule, // Import to use DashboardAuthService
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
