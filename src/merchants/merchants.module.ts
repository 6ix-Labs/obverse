import { Module, forwardRef } from '@nestjs/common';
import { MerchantService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Merchant, MerchantSchema } from './schema/merchant.schema';
import { MerchantRepository } from './merchants.repository';
import { WalletModule } from 'src/wallet/wallet.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    forwardRef(() => WalletModule),
  ],
  providers: [MerchantService, MerchantRepository],
  controllers: [MerchantsController],
  exports: [MerchantService, MerchantRepository],
})
export class MerchantsModule {}
