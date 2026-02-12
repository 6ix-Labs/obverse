import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKey, ApiKeySchema } from './schemas/api-key.schema';
import { ApiKeyGuard } from './guards/api-key.guard';
import { OptionalApiKeyGuard } from './guards/optional-api-key.guard';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }]),
    forwardRef(() => MerchantsModule), // Import to inject MerchantService
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyGuard, OptionalApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard, OptionalApiKeyGuard, MongooseModule], // Export for use in other modules
})
export class ApiKeysModule {}
