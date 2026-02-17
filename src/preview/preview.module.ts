import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { PreviewDataService } from './preview-data.service';
import { PreviewTemplateService } from './preview-template.service';
import { PreviewImageAdapter } from './adapters/preview-image.adapter';
import { PreviewSigningService } from './preview-signing.service';
import { PaymentLinksModule } from '../payment-links/payment-links.module';
import { PaymentsModule } from '../payments/payments.module';
import { PreviewExceptionFilter } from './preview-exception.filter.js';
import { PreviewLoggingInterceptor } from './preview-logging.interceptor.js';

@Module({
    imports: [ConfigModule, PaymentLinksModule, PaymentsModule],
    controllers: [PreviewController],
    providers: [
        PreviewService,
        PreviewDataService,
        PreviewTemplateService,
        PreviewImageAdapter,
        PreviewSigningService,
        PreviewExceptionFilter,
        PreviewLoggingInterceptor,
    ],
    exports: [PreviewSigningService, PreviewService],
})
export class PreviewModule { }
