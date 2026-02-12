import { Injectable } from '@nestjs/common';
import { MerchantService } from 'src/merchants/merchants.service';
import { PaymentLinksService } from 'src/payment-links/payment-links.service';
import { ConversationManager } from '../conversation/conversation.manager';
import {
  getSupportedTokensForChain,
  isTokenSupported,
} from 'src/blockchain/config/chains.config';

@Injectable()
export class CreateLinkHandler {
  constructor(
    private merchantsService: MerchantService,
    private paymentLinksService: PaymentLinksService,
    private conversationManager: ConversationManager,
  ) {}

  async handle(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant || !merchant.walletAddress) {
      await ctx.reply(`⚠️ Please set up your wallet first using /start`);
      return;
    }

    // Start payment link creation flow
    await this.conversationManager.setState(
      telegramId,
      merchant._id.toString(),
      'payment',
      'awaiting_custom_fields',
      {},
    );

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 Name & Email', callback_data: 'fields:name,email' },
          { text: '📞 Full Contact', callback_data: 'fields:name,email,phone' },
        ],
        [{ text: '⏭️ Skip', callback_data: 'fields:none' }],
      ],
    };

    await ctx.reply(
      `💰 Let's create a payment link!\n\n` +
        `What customer details do you want to collect?\n\n` +
        `Type field names separated by commas:\n` +
        `Example: \`company name, email, order notes\`\n\n` +
        `Or use quick options below:`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    );
  }

  async handleCustomFieldsInput(ctx: any, state: any) {
    let customFields: string[] = [];

    if (ctx.callbackQuery) {
      // Handle button click
      const data = ctx.callbackQuery.data.replace('fields:', '');
      customFields = data === 'none' ? [] : data.split(',');
      await ctx.answerCbQuery();
    } else {
      // Handle text input
      const input = ctx.message.text.trim().toLowerCase();
      if (input === 'none' || input === 'skip') {
        customFields = [];
      } else {
        customFields = input.split(',').map((f: string) => f.trim());
      }
    }
    const updatedData = { ...state.data, customFields };
    await this.conversationManager.updateState(
      ctx.from.id.toString(),
      'awaiting_amount',
      updatedData,
    );

    const fieldsText =
      customFields.length > 0 ? `• ${customFields.join('\n• ')}` : 'None';

    await ctx.reply(
      `✅ Fields to collect:\n${fieldsText}\n\n` +
        `💵 What amount should customers pay?\n\n` +
        `Examples:\n` +
        `• \`50 USDC\`\n` +
        `• \`0.1 SOL\`\n` +
        `• \`100 USDT\``,
      { parse_mode: 'Markdown' },
    );
  }

  async handleAmountInput(ctx: any, state: any) {
    const input = ctx.message.text.trim().toUpperCase();

    // Parse amount and token (e.g., "50 USDC", "0.1 SOL", or "100 MON")
    const match = input.match(/^([\d.]+)\s*(USDC|SOL|USDT|MON)$/i);

    if (!match) {
      await ctx.reply(
        `❌ Invalid format.\n\n` +
          `Please use format: \`50 USDC\`, \`0.1 SOL\`, or \`100 MON\``,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const amount = parseFloat(match[1]);
    const token = match[2].toUpperCase();

    if (amount <= 0) {
      await ctx.reply(`❌ Amount must be greater than 0`);
      return;
    }

    // Validate minimum amounts
    if (token === 'MON' && amount < 0.0001) {
      await ctx.reply(`❌ Minimum amount for MON is 0.0001`);
      return;
    }

    const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD'];
    if (stablecoins.includes(token) && amount < 0.005) {
      await ctx.reply(`❌ Minimum amount for ${token} is 0.005`);
      return;
    }

    const selectedChain = state.data?.selectedChain || state.data?.chain;
    if (selectedChain && !isTokenSupported(selectedChain, token)) {
      const supportedTokens =
        getSupportedTokensForChain(selectedChain).join(', ');
      await ctx.reply(
        `❌ ${token} is not supported on ${selectedChain}.\n\n` +
          `Supported tokens: ${supportedTokens}\n\n` +
          `Please enter a valid amount and token for ${selectedChain}.\n` +
          `Example: \`50 ${getSupportedTokensForChain(selectedChain)[0]}\``,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const updatedData = { ...state.data, amount, token };
    await this.conversationManager.updateState(
      ctx.from.id.toString(),
      'awaiting_description',
      updatedData,
    );

    await ctx.reply(
      `📝 Add a description for this payment link (optional)\n\n` +
        `Example: \`Monthly subscription\` or \`Coffee order\`\n\n` +
        `Or type \`skip\` to continue.`,
      { parse_mode: 'Markdown' },
    );
  }

  async handleDescriptionInput(ctx: any, state: any) {
    const description = ctx.message.text.trim();
    const finalDescription =
      description.toLowerCase() === 'skip' ? '' : description;

    const updatedData = { ...state.data, description: finalDescription };
    await this.conversationManager.updateState(
      ctx.from.id.toString(),
      'awaiting_chain_selection',
      updatedData,
    );

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⚡ Solana', callback_data: 'chain:solana' },
          { text: '🔥 Monad', callback_data: 'chain:monad' },
        ],
      ],
    };

    await ctx.reply(`🔗 Select blockchain for this payment link:`, {
      reply_markup: keyboard,
    });
  }

  async handleChainSelection(ctx: any, state: any) {
    const chain = ctx.callbackQuery.data.replace('chain:', '');
    await ctx.answerCbQuery();

    const selectedToken = state.data?.token;
    if (selectedToken && !isTokenSupported(chain, selectedToken)) {
      const supportedTokens = getSupportedTokensForChain(chain);
      await this.conversationManager.updateState(
        ctx.from.id.toString(),
        'awaiting_amount',
        { ...state.data, selectedChain: chain },
      );

      await ctx.reply(
        `❌ ${selectedToken} is not supported on ${chain}.\n\n` +
          `Supported tokens for ${chain}: ${supportedTokens.join(', ')}\n\n` +
          `Please enter amount again using a supported token.\n` +
          `Example: \`50 ${supportedTokens[0]}\``,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const updatedData = { ...state.data, chain, selectedChain: chain };
    await this.conversationManager.updateState(
      ctx.from.id.toString(),
      'awaiting_reusable',
      updatedData,
    );

    const chainName = chain.charAt(0).toUpperCase() + chain.slice(1);
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Reusable', callback_data: 'reusable:true' },
          { text: '1️⃣ One-time', callback_data: 'reusable:false' },
        ],
      ],
    };

    await ctx.reply(
      `✅ ${chainName} selected!\n\n🔄 Should this link be reusable or one-time use?`,
      { reply_markup: keyboard },
    );
  }

  async handleReusableInput(ctx: any, state: any) {
    const isReusable = ctx.callbackQuery.data === 'reusable:true';
    await ctx.answerCbQuery();

    const { customFields, amount, token, description, chain } = state.data;

    // Create payment link
    const customFieldsFormatted = (customFields || []).map((name: string) => ({
      fieldName: name,
      fieldType: name.includes('email') ? 'email' : 'text',
      required: true,
    }));

    const paymentLink = await this.paymentLinksService.createPaymentLink({
      merchantId: state.merchantId.toString(),
      amount,
      token,
      chain: chain || 'solana', // Include chain selection
      description,
      customFields: customFieldsFormatted,
      isReusable,
    });

    await this.conversationManager.clearState(ctx.from.id.toString());

    const paymentBaseUrl = process.env.PAYMENT_URL
      ? process.env.PAYMENT_URL.replace(/\/$/, '')
      : process.env.APP_URL
        ? `${process.env.APP_URL.replace(/\/$/, '')}/pay`
        : 'https://pay.obverse.app';
    const paymentUrl = `${paymentBaseUrl}/${paymentLink.linkId}`;

    const fieldsText =
      customFields?.length > 0
        ? `📝 Collects: ${customFields.join(', ')}`
        : '📝 No fields';

    const chainName =
      (chain || 'solana').charAt(0).toUpperCase() +
      (chain || 'solana').slice(1);

    await ctx.reply(
      `✅ Payment link created!\n\n` +
        `💵 Amount: ${amount} ${token}\n` +
        `⚡ Blockchain: ${chainName}\n` +
        `${description ? `📋 Description: ${description}\n` : ''}` +
        `${fieldsText}\n` +
        `🔄 Type: ${isReusable ? 'Reusable' : 'One-time'}\n\n` +
        `🔗 Link:\n\`${paymentUrl}\`\n\n` +
        `Share this link with your customers!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 Copy Link', url: paymentUrl },
              {
                text: '📊 View Stats',
                callback_data: `view:${paymentLink.linkId}`,
              },
            ],
            [{ text: '➕ Create Another', callback_data: 'create_new' }],
          ],
        },
      },
    );
  }
}
