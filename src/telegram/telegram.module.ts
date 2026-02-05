import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramGateway } from './telegram.gateway';
import { HelpHandler } from './handlers/help.handler';
import { ListLinksHandler } from './handlers/list-links.handler';
import { ViewLinkHandler } from './handlers/view-link.handler';
import { StartHandler } from './handlers/start.handler';
import { CreateLinkHandler } from './handlers/create-link.handler';
import { WalletHandler } from './handlers/wallet.handler';
import { SettingsHandler } from './handlers/setting.handler';
import { TransactionsHandler } from './handlers/transactions.handler';
import { BalanceHandler } from './handlers/balance.handler';
import { SendHandler } from './handlers/send.handler';
import { DashboardHandler } from './handlers/dashboard.handler';
import { MerchantsModule } from 'src/merchants/merchants.module';
import { PaymentLinksModule } from 'src/payment-links/payment-links.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConversationManager } from './conversation/conversation.manager';
import {
  ConversationState,
  ConversationStateSchema,
} from './schemas/conversation-state.schema';
import { ConversationRepository } from './conversation.repository';

@Module({
  imports: [
    MerchantsModule,
    PaymentLinksModule,
    PaymentsModule,
    TransactionsModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: ConversationState.name, schema: ConversationStateSchema },
    ]),
  ],
  providers: [
    TelegramService,
    TelegramGateway,
    HelpHandler,
    ListLinksHandler,
    ViewLinkHandler,
    StartHandler,
    CreateLinkHandler,
    WalletHandler,
    SettingsHandler,
    TransactionsHandler,
    BalanceHandler,
    SendHandler,
    DashboardHandler,
    ConversationManager,
    ConversationRepository,
  ],
  controllers: [TelegramController],
  exports: [ConversationRepository],
})
export class TelegramModule {}
