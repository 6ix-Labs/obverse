import { Injectable } from '@nestjs/common';
import { MerchantService } from '../../merchants/merchants.service';
import { ConversationManager } from '../conversation/conversation.manager';

@Injectable()
export class WalletHandler {
  constructor(
    private merchantsService: MerchantService,
    private conversationManager: ConversationManager,
  ) { }

  async handle(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.reply(`⚠️ Please set up your account with /start`);
      return;
    }

    // Build wallet details message
    let message = `👛 Your Wallets\n\n`;

    if (merchant.wallets && merchant.wallets.length > 0) {
      // Show all wallets with chain info
      merchant.wallets.forEach((wallet, index) => {
        const statusEmoji = wallet.isActive ? '✅' : '❌';
        const chainName = wallet.chain.charAt(0).toUpperCase() + wallet.chain.slice(1);
        const maskedAddress = `${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}`;

        message += `${index + 1}. ${statusEmoji} ${chainName}\n`;
        message += `   ${wallet.label || 'Wallet'}\n`;
        message += `   \`${maskedAddress}\`\n\n`;
      });

      message += `🪙 Default Chain: ${merchant.defaultChain.charAt(0).toUpperCase() + merchant.defaultChain.slice(1)}\n\n`;
    } else if (merchant.walletAddress) {
      // Fallback for legacy single wallet
      const maskedAddress = `${merchant.walletAddress.slice(0, 8)}...${merchant.walletAddress.slice(-8)}`;
      message += `Primary Wallet:\n\`${maskedAddress}\`\n\n`;
    } else {
      message += `No wallets configured yet.\n\n`;
    }

    message += `💡 This is where you'll receive payments from your payment links.`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✏️ Update Wallet', callback_data: 'update_wallet' },
          { text: '➕ Add Wallet', callback_data: 'add_wallet' },
        ],
        [{ text: '« Back', callback_data: 'cancel' }],
      ],
    };

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async startWalletUpdate(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    await ctx.answerCbQuery();

    // If merchant has multiple wallets, let them choose which to update
    if (merchant.wallets && merchant.wallets.length > 1) {
      const buttons = merchant.wallets.map((wallet, index) => {
        const chainName = wallet.chain.charAt(0).toUpperCase() + wallet.chain.slice(1);
        return [{
          text: `${chainName} - ${wallet.label || 'Wallet'}`,
          callback_data: `update_wallet_chain:${wallet.chain}`,
        }];
      });

      buttons.push([{ text: '« Cancel', callback_data: 'cancel' }]);

      await ctx.reply(
        `✏️ Which wallet would you like to update?`,
        { reply_markup: { inline_keyboard: buttons } }
      );
      return;
    }

    // Single wallet or legacy - proceed with update
    const chain = merchant.wallets?.[0]?.chain || 'solana';
    await this.promptWalletUpdate(ctx, merchant, chain);
  }

  async handleWalletChainSelection(ctx: any, chain: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    await ctx.answerCbQuery();
    await this.promptWalletUpdate(ctx, merchant, chain);
  }

  private async promptWalletUpdate(ctx: any, merchant: any, chain: string) {
    const telegramId = ctx.from.id.toString();

    await this.conversationManager.setState(
      telegramId,
      merchant._id.toString(),
      'wallet',
      'awaiting_new_wallet',
      { chain }
    );

    const chainName = chain.charAt(0).toUpperCase() + chain.slice(1);
    const exampleAddress = chain === 'solana'
      ? '9xQe...7Kkp'
      : '0x742d...35Aa';

    await ctx.reply(
      `✏️ Update ${chainName} Wallet Address\n\n` +
      `Please send your new ${chainName} wallet address.\n\n` +
      `Example: \`${exampleAddress}\`\n\n` +
      `Type \`cancel\` to abort.`,
      { parse_mode: 'Markdown' }
    );
  }

  async handleWalletInput(ctx: any, state: any) {
    const input = ctx.message.text.trim();

    if (input.toLowerCase() === 'cancel') {
      await this.conversationManager.clearState(ctx.from.id.toString());
      await ctx.reply(`❌ Wallet update cancelled.`);
      return;
    }

    const chain = state.data.chain || 'solana';

    // Validate based on chain
    let isValid = false;
    if (chain === 'solana') {
      // Solana address validation (base58, 32-44 chars)
      const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      isValid = solanaAddressRegex.test(input);
    } else {
      // EVM address validation (0x + 40 hex chars)
      const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      isValid = evmAddressRegex.test(input);
    }

    if (!isValid) {
      const chainName = chain.charAt(0).toUpperCase() + chain.slice(1);
      const format = chain === 'solana'
        ? '32-44 characters (base58)'
        : '0x followed by 40 hexadecimal characters';

      await ctx.reply(
        `❌ Invalid ${chainName} wallet address.\n\n` +
        `Please send a valid ${chainName} address (${format}).\n` +
        `Or type \`cancel\` to abort.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Update wallet
    await this.merchantsService.updateWallet(state.merchantId, input, chain);
    await this.conversationManager.clearState(ctx.from.id.toString());

    const chainName = chain.charAt(0).toUpperCase() + chain.slice(1);
    const maskedAddress = chain === 'solana'
      ? `${input.slice(0, 8)}...${input.slice(-8)}`
      : `${input.slice(0, 6)}...${input.slice(-4)}`;

    await ctx.reply(
      `✅ ${chainName} wallet address updated!\n\n` +
      `New address:\n\`${maskedAddress}\`\n\n` +
      `Payments on ${chainName} will be sent to this address.`,
      { parse_mode: 'Markdown' }
    );
  }

  async startAddWallet(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    await ctx.answerCbQuery();

    // Show available chains to add
    const existingChains = merchant.wallets?.map(w => w.chain) || [];
    const availableChains = ['solana', 'ethereum', 'base', 'polygon', 'arbitrum']
      .filter(chain => !existingChains.includes(chain));

    if (availableChains.length === 0) {
      await ctx.reply(
        `✅ You've already added wallets for all supported chains.\n\n` +
        `You can update existing wallets using the "Update Wallet" option.`
      );
      return;
    }

    const buttons = availableChains.map(chain => {
      const chainName = chain.charAt(0).toUpperCase() + chain.slice(1);
      return [{
        text: chainName,
        callback_data: `add_wallet_chain:${chain}`,
      }];
    });

    buttons.push([{ text: '« Cancel', callback_data: 'cancel' }]);

    await ctx.reply(
      `➕ Add Wallet\n\n` +
      `Select which blockchain to add a wallet for:`,
      { reply_markup: { inline_keyboard: buttons } }
    );
  }

  async handleAddWalletChainSelection(ctx: any, chain: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    await ctx.answerCbQuery();

    await this.conversationManager.setState(
      telegramId,
      merchant._id.toString(),
      'wallet',
      'awaiting_new_wallet',
      { chain, isAdding: true }
    );

    const chainName = chain.charAt(0).toUpperCase() + chain.slice(1);
    const exampleAddress = chain === 'solana'
      ? '9xQe...7Kkp'
      : '0x742d...35Aa';

    await ctx.reply(
      `➕ Add ${chainName} Wallet\n\n` +
      `Please send your ${chainName} wallet address.\n\n` +
      `Example: \`${exampleAddress}\`\n\n` +
      `Type \`cancel\` to abort.`,
      { parse_mode: 'Markdown' }
    );
  }
}
