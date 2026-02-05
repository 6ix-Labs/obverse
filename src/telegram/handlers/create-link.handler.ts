import { Injectable } from '@nestjs/common';
import { MerchantService } from 'src/merchants/merchants.service';
import { PaymentLinksService } from 'src/payment-links/payment-links.service';
import { ConversationManager } from '../conversation/conversation.manager';

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

    // Parse amount and token (e.g., "50 USDC" or "0.1 SOL")
    const match = input.match(/^([\d.]+)\s*(USDC|SOL|USDT)$/i);

    if (!match) {
      await ctx.reply(
        `❌ Invalid format.\n\n` +
          `Please use format: \`50 USDC\` or \`0.1 SOL\``,
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

    // Validate minimum amount for stablecoins
    const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD'];
    if (stablecoins.includes(token) && amount < 0.005) {
      await ctx.reply(`❌ Minimum amount for ${token} is 0.005`);
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
      'awaiting_reusable',
      updatedData,
    );

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Reusable', callback_data: 'reusable:true' },
          { text: '1️⃣ One-time', callback_data: 'reusable:false' },
        ],
      ],
    };

    await ctx.reply(`🔄 Should this link be reusable or one-time use?`, {
      reply_markup: keyboard,
    });
  }

  async handleReusableInput(ctx: any, state: any) {
    const isReusable = ctx.callbackQuery.data === 'reusable:true';
    await ctx.answerCbQuery();

    const { customFields, amount, token, description } = state.data;

    // Create payment link
    const merchant = await this.merchantsService.findById(state.merchantId);

    const customFieldsFormatted = (customFields || []).map((name: string) => ({
      fieldName: name,
      fieldType: name.includes('email') ? 'email' : 'text',
      required: true,
    }));

    const paymentLink = await this.paymentLinksService.createPaymentLink({
      merchantId: state.merchantId.toString(),
      amount,
      token,
      description,
      customFields: customFieldsFormatted,
      isReusable,
    });

    await this.conversationManager.clearState(ctx.from.id.toString());

    const paymentUrl = `${process.env.APP_URL}/pay/${paymentLink.linkId}`;

    const fieldsText =
      customFields?.length > 0
        ? `📝 Collects: ${customFields.join(', ')}`
        : '📝 No fields';

    await ctx.reply(
      `✅ Payment link created!\n\n` +
        `💵 Amount: ${amount} ${token}\n` +
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
