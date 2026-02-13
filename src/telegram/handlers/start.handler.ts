import { Injectable, Logger } from '@nestjs/common';
import { ConversationManager } from '../conversation/conversation.manager';
import { MerchantService } from 'src/merchants/merchants.service';
import { MerchantDocument } from 'src/merchants/schema/merchant.schema';

@Injectable()
export class StartHandler {
  private readonly logger = new Logger(StartHandler.name);
  constructor(
    private merchantsService: MerchantService,
    private conversationManager: ConversationManager,
  ) {}

  async handle(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || 'user';
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name;

    // Check if merchant exists
    const existingMerchant =
      await this.merchantsService.findByTelegramId(telegramId);

    if (existingMerchant && existingMerchant.walletAddress) {
      await this.merchantsService.upgradeWalletForEvm(telegramId).catch(() => {
        // Best effort: don't block /start if wallet upgrade fails.
      });

      const refreshedMerchant =
        await this.merchantsService.findByTelegramId(telegramId);
      const activeChains =
        refreshedMerchant?.wallets
          ?.filter((wallet) => wallet.isActive)
          .map((wallet) => wallet.chain.toUpperCase())
          .join(', ') || 'SOLANA';

      // Existing merchant
      await ctx.reply(
        `👋 Welcome back, ${firstName}!\n\n` +
          `Your wallet: \`${existingMerchant.walletAddress.slice(0, 8)}...${existingMerchant.walletAddress.slice(-8)}\`\n` +
          `Chains enabled: ${activeChains}\n\n` +
          `What would you like to do?\n\n` +
          `/payment - Create a payment link\n` +
          `/links - View your payment links\n` +
          `/wallet - View your wallet\n` +
          `/settings - Configure settings\n` +
          `/help - Show all commands`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // New merchant - create with Turnkey wallet automatically
    try {
      const result = await this.merchantsService.createMerchant(
        telegramId,
        username,
        firstName,
        lastName,
      );

      // Handle case where merchant already existed (from createMerchant returning getMerchantWithWallet)
      if (!result || !result.wallet) {
        throw new Error('Failed to create wallet');
      }

      const { merchant, wallet } = result;

      await ctx.reply(
        `🎉 Welcome to Obverse!\n\n` +
          `Your wallet has been created:\n` +
          `\`${wallet.solanaAddress}\`\n\n` +
          `You can now receive stablecoin payments directly to this wallet.\n\n` +
          `/payment - Create a payment link\n` +
          `/help - Show all commands`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create merchant wallet: ${error.message}`,
        error.stack,
      );
      await ctx.reply(
        `❌ Sorry, there was an error creating your wallet.\n\n` +
          `Please try again with /start or contact support.`,
      );
    }
  }

  async handleWalletInput(ctx: any, state: any) {
    const walletAddress = ctx.message.text.trim();

    // Basic Solana address validation (base58, 32-44 chars)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    if (!solanaAddressRegex.test(walletAddress)) {
      await ctx.reply(
        `❌ Invalid Solana wallet address.\n\n` +
          `Please send a valid Solana address (32-44 characters).`,
      );
      return;
    }

    // Update merchant wallet
    await this.merchantsService.updateWallet(state.merchantId, walletAddress);
    await this.conversationManager.clearState(ctx.from.id.toString());

    await ctx.reply(
      `✅ Wallet address saved!\n\n` +
        `You're all set! Here's what you can do:\n\n` +
        `/payment - Create your first payment link\n` +
        `/links - View your payment links\n` +
        `/wallet - Update your wallet\n` +
        `/settings - Configure settings\n` +
        `/help - Show all commands`,
    );
  }
}
