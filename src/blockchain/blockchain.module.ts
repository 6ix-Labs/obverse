import { Module, forwardRef } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { EvmService } from './services/evm.service';
import { PaymentsModule } from 'src/payments/payments.module';
import { MerchantsModule } from 'src/merchants/merchants.module';

@Module({
  imports: [
    forwardRef(() => PaymentsModule),
    forwardRef(() => MerchantsModule),
  ],
  providers: [BlockchainService, EvmService],
  controllers: [BlockchainController],
  exports: [EvmService], // Export EvmService for use in other modules
})
export class BlockchainModule {}
