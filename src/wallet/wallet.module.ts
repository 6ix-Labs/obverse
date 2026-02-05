import { Module } from '@nestjs/common';
// import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { ConfigModule } from '@nestjs/config';
import turnkeyConfig from './config/turnkey.config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserWalletModel,
  UserWalletSchema,
} from './schemas/user-wallet.schema';
import { TurnkeyProvider } from './repositories/turnkey.provider';
import { MongoWalletRepository } from './repositories/wallet-mongo.repository';
import { TURNKEY_PROVIDER } from './interfaces/turnkey-provider.interface';
import { WALLET_REPOSITORY } from './interfaces/wallet-repository.interface';
import { WalletService } from './services/wallet.service';
import { BalanceService } from './services/balance.service';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';

@Module({
  imports: [
    ConfigModule.forFeature(turnkeyConfig),
    MongooseModule.forFeature([
      { name: UserWalletModel.name, schema: UserWalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  providers: [
    WalletService,
    BalanceService,
    TurnkeyProvider,
    MongoWalletRepository,
    {
      provide: TURNKEY_PROVIDER,
      useExisting: TurnkeyProvider,
    },
    {
      provide: WALLET_REPOSITORY,
      useClass: MongoWalletRepository,
    },
  ],
  controllers: [WalletController],
  exports: [WalletService, WALLET_REPOSITORY],
})
export class WalletModule {}
