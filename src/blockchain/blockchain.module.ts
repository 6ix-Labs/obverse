import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { PaymentsModule } from 'src/payments/payments.module';
import { MerchantsModule } from 'src/merchants/merchants.module';

@Module({
  imports: [PaymentsModule, MerchantsModule],
  providers: [BlockchainService],
  controllers: [BlockchainController],
})
export class BlockchainModule {}
