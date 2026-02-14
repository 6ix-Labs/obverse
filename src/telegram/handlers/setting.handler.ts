import { Injectable } from '@nestjs/common';
import { MerchantService } from 'src/merchants/merchants.service';
import { ConversationManager } from '../conversation/conversation.manager';

@Injectable()
export class SettingsHandler {
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

    const needsUpgrade = await this.merchantsService.needsWalletUpgrade(telegramId);
    await this.showSettings(ctx, merchant, needsUpgrade);
  }

  private async showSettings(ctx: any, merchant: any, needsUpgrade = false) {
    const notificationStatus = merchant.notificationsEnabled
      ? '🔔 ON'
      : '🔕 OFF';
    const webhookStatus = merchant.webhookUrl ? '✅ Set' : '❌ Not set';

    const buttons: any[][] = [
      [
        {
          text: `Default Token: ${merchant.defaultToken}`,
          callback_data: 'setting:token',
        },
      ],
      [
        {
          text: `Notifications: ${notificationStatus}`,
          callback_data: 'setting:notifications',
        },
      ],
      [
        {
          text: `Webhook: ${webhookStatus}`,
          callback_data: 'setting:webhook',
        },
      ],
      [{ text: '📋 Default Fields', callback_data: 'setting:fields' }],
    ];

    // Show upgrade button only for Solana-only users
    if (needsUpgrade) {
      buttons.push([{ text: '🔄 Upgrade Wallet (+ Monad)', callback_data: 'setting:upgrade_wallet' }]);
    }

    buttons.push([{ text: '« Back', callback_data: 'cancel' }]);

    const keyboard = { inline_keyboard: buttons };

    await ctx.reply(
      `⚙️ Settings\n\n` +
      `Configure your default preferences for payment links.\n\n` +
      `Current settings:\n` +
      `• Default Token: ${merchant.defaultToken}\n` +
      `• Notifications: ${merchant.notificationsEnabled ? 'Enabled' : 'Disabled'}\n` +
      `• Webhook URL: ${merchant.webhookUrl || 'Not set'}\n` +
      `• Default Fields: ${merchant.defaultCustomFields?.join(', ') || 'None'}`,
      { reply_markup: keyboard },
    );
  }
  async handleTokenChange(ctx: any) {
    await ctx.answerCbQuery();

    const keyboard = {
      inline_keyboard: [
        [
          { text: 'USDC', callback_data: 'token:USDC' },
          { text: 'SOL', callback_data: 'token:SOL' },
          { text: 'USDT', callback_data: 'token:USDT' },
        ],
        [{ text: '« Back', callback_data: 'back_to_settings' }],
      ],
    };

    await ctx.reply(
      `🪙 Select Default Token\n\n` +
      `This will be the default token for new payment links.`,
      { reply_markup: keyboard },
    );
  }

  async updateToken(ctx: any, token: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    await this.merchantsService.updateSettings(telegramId, {
      defaultToken: token,
    });

    await ctx.answerCbQuery(`✅ Default token set to ${token}`);
    await this.showSettings(
      ctx,
      await this.merchantsService.findByTelegramId(telegramId),
    );
  }

  async toggleNotifications(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    const newStatus = !merchant.notificationsEnabled;

    await this.merchantsService.updateSettings(telegramId, {
      notificationsEnabled: newStatus,
    });

    await ctx.answerCbQuery(
      `✅ Notifications ${newStatus ? 'enabled' : 'disabled'}`,
    );
    await this.showSettings(
      ctx,
      await this.merchantsService.findByTelegramId(telegramId),
    );
  }

  async startWebhookSetup(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    await ctx.answerCbQuery();

    await this.conversationManager.setState(
      telegramId,
      merchant._id.toString(),
      'settings',
      'awaiting_webhook',
      {},
    );

    await ctx.reply(
      `🔗 Set Webhook URL\n\n` +
      `Send me the URL where you want to receive payment notifications.\n\n` +
      `Example: \`https://yourdomain.com/webhook\`\n\n` +
      `Type \`remove\` to remove the current webhook, or \`cancel\` to abort.`,
      { parse_mode: 'Markdown' },
    );
  }

  async handleWebhookInput(ctx: any, state: any) {
    const input = ctx.message.text.trim();

    if (input.toLowerCase() === 'cancel') {
      await this.conversationManager.clearState(ctx.from.id.toString());
      await ctx.reply(`❌ Webhook setup cancelled.`);
      return;
    }

    if (input.toLowerCase() === 'remove') {
      const telegramId = ctx.from.id.toString();
      await this.merchantsService.updateSettings(telegramId, {
        webhookUrl: undefined,
      });
      await this.conversationManager.clearState(telegramId);
      await ctx.reply(`✅ Webhook URL removed.`);
      return;
    }

    // Basic URL validation
    const urlRegex = /^https?:\/\/.+/;

    if (!urlRegex.test(input)) {
      await ctx.reply(
        `❌ Invalid URL.\n\n` +
        `Please send a valid HTTP/HTTPS URL.\n` +
        `Or type \`cancel\` to abort.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const telegramId = ctx.from.id.toString();
    await this.merchantsService.updateSettings(telegramId, {
      webhookUrl: input,
    });
    await this.conversationManager.clearState(telegramId);

    await ctx.reply(
      `✅ Webhook URL updated!\n\n` +
      `URL: \`${input}\`\n\n` +
      `You'll receive POST requests when payments are confirmed.`,
      { parse_mode: 'Markdown' },
    );
  }

  async startDefaultFieldsSetup(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    await ctx.answerCbQuery();

    await this.conversationManager.setState(
      telegramId,
      merchant._id.toString(),
      'settings',
      'awaiting_default_fields',
      {},
    );

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📋 Name & Email',
            callback_data: 'default_fields:name,email',
          },
        ],
        [
          {
            text: '📞 Full Contact',
            callback_data: 'default_fields:name,email,phone',
          },
        ],
        [{ text: '⏭️ None', callback_data: 'default_fields:none' }],
      ],
    };

    await ctx.reply(
      `📋 Set Default Fields\n\n` +
      `These fields will be automatically selected when creating new payment links.\n\n` +
      `Type field names separated by commas:\n` +
      `Example: \`name, email, company\`\n\n` +
      `Or use quick options below:`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    );
  }

  async handleDefaultFieldsInput(ctx: any, state: any) {
    let fields: string[] = [];

    if (ctx.callbackQuery) {
      const data = ctx.callbackQuery.data.replace('default_fields:', '');
      fields = data === 'none' ? [] : data.split(',');
      await ctx.answerCbQuery();
    } else {
      const input = ctx.message.text.trim().toLowerCase();
      if (input === 'none' || input === 'cancel') {
        fields = [];
      } else {
        fields = input.split(',').map((f: string) => f.trim());
      }
    }

    const telegramId = ctx.from.id.toString();
    await this.merchantsService.updateSettings(telegramId, {
      defaultCustomFields: fields,
    });
    await this.conversationManager.clearState(telegramId);

    const fieldsText = fields.length > 0 ? fields.join(', ') : 'None';

    await ctx.reply(
      `✅ Default fields updated!\n\n` +
      `Default fields: ${fieldsText}\n\n` +
      `These will be pre-selected when you create new payment links.`,
    );
  }

  async handleWalletUpgrade(ctx: any) {
    const telegramId = ctx.from.id.toString();

    await ctx.reply('🔄 Upgrading your wallet to support Monad...');

    try {
      const result = await this.merchantsService.upgradeWalletForEvm(telegramId);

      if (result.wasUpgraded && result.wallet?.ethereumAddress) {
        const maskedAddr = `${result.wallet.ethereumAddress.slice(0, 6)}...${result.wallet.ethereumAddress.slice(-4)}`;
        await ctx.reply(
          `✅ Wallet upgraded!\n\n` +
          `Your new Monad wallet:\n\`${maskedAddr}\`\n\n` +
          `You can now accept payments on both Solana and Monad.`,
          { parse_mode: 'Markdown' },
        );
      } else if (result.wallet?.ethereumAddress) {
        await ctx.reply(
          `✅ Your wallet already supports Monad!\n\n` +
          `Use /wallet to view all your addresses.`,
        );
      } else {
        await ctx.reply(
          `⚠️ Could not auto-derive a Monad address.\n\n` +
          `You can add one manually via /wallet → ➕ Add Wallet.`,
        );
      }
    } catch (error) {
      await ctx.reply(
        `❌ Upgrade failed: ${error.message}\n\n` +
        `You can try again later or add a Monad wallet manually via /wallet.`,
      );
    }
  }
}
