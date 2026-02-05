import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { MerchantService } from '../../merchants/merchants.service';
import { DashboardAuthService } from '../../auth/dashboard-auth.service';
import { PaymentLinksService } from '../../payment-links/payment-links.service';

@Injectable()
export class DashboardHandler {
  private readonly logger = new Logger(DashboardHandler.name);

  constructor(
    private merchantsService: MerchantService,
    private dashboardAuthService: DashboardAuthService,
    private paymentLinksService: PaymentLinksService,
  ) {}

  async handle(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id.toString();

    try {
      // Get merchant
      const merchant = await this.merchantsService.findByTelegramId(telegramId);
      if (!merchant) {
        await ctx.reply(
          '❌ Please start with /start first to create your account.',
        );
        return;
      }

      // Get merchant's payment links
      const links = await this.paymentLinksService.findByMerchantId(
        merchant._id.toString(),
      );

      if (links.length === 0) {
        await ctx.reply(
          "❌ You don't have any payment links yet.\n\n" +
            'Create one first using /payment command.',
        );
        return;
      }

      // Create inline keyboard with payment links
      const keyboard = links.slice(0, 10).map((link) => {
        const linkText = link.description
          ? `📊 ${link.description}`
          : `📊 ${link.amount} ${link.token}`;
        const statusEmoji = link.isActive ? '✅' : '⏸️';
        const paymentsText =
          link.paymentCount > 0 ? ` - ${link.paymentCount} payments` : '';

        return [
          {
            text: `${statusEmoji} ${linkText}${paymentsText}`,
            callback_data: `dashboard:generate:${link._id.toString()}`,
          },
        ];
      });

      await ctx.reply(
        `📊 *Select Payment Link*\n\n` +
          `Choose which payment link you want to create a dashboard for:\n\n` +
          `Each dashboard shows analytics for ONE payment link only.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard,
          },
        },
      );

      this.logger.log(
        `Showed ${links.length} payment links to merchant ${merchant._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Dashboard handler error: ${error.message}`,
        error.stack,
      );
      await ctx.reply(
        '❌ Error loading payment links. Please try again later or contact support.',
      );
    }
  }

  /**
   * Handle callback queries (inline button clicks)
   */
  async handleCallback(ctx: any) {
    if (!ctx.from) return;
    const callbackData = ctx.callbackQuery?.data;

    // Handle payment link selection
    if (callbackData?.startsWith('dashboard:generate:')) {
      const paymentLinkId = callbackData.replace('dashboard:generate:', '');
      const telegramId = ctx.from.id.toString();

      try {
        await ctx.answerCbQuery('Generating credentials...');

        // Get merchant
        const merchant =
          await this.merchantsService.findByTelegramId(telegramId);
        if (!merchant) {
          await ctx.reply('❌ Merchant not found');
          return;
        }

        // Get payment link details
        const link = await this.paymentLinksService.findById(paymentLinkId);
        if (!link || link.merchantId.toString() !== merchant._id.toString()) {
          await ctx.reply('❌ Payment link not found or access denied');
          return;
        }

        // Generate temporary password for this specific payment link
        const { identifier, temporaryPassword, expiresAt } =
          await this.dashboardAuthService.generateTemporaryPassword(
            merchant._id.toString(),
            paymentLinkId,
          );

        const expiryTime = expiresAt.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC',
        });

        const expiryDate = expiresAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });

        // Get dashboard URL from environment
        // Fallback order: DASHBOARD_URL -> APP_URL/dashboard -> Error
        const dashboardUrl =
          process.env.DASHBOARD_URL ||
          (process.env.APP_URL ? `${process.env.APP_URL}/dashboard` : null);

        if (!dashboardUrl) {
          this.logger.error(
            'DASHBOARD_URL or APP_URL environment variable not set',
          );
          await ctx.reply(
            '❌ Dashboard is not configured. Please contact support.',
          );
          return;
        }

        const linkDisplay = link.description || `${link.amount} ${link.token}`;

        await ctx.reply(
          `🔐 *Dashboard Access Generated*\n\n` +
            `📊 *Payment Link:* ${linkDisplay}\n\n` +
            `Your temporary login credentials:\n\n` +
            `👤 *Username:* \`${identifier}\`\n` +
            `🔑 *Password:* \`${temporaryPassword}\`\n\n` +
            `⏰ *Valid until:* ${expiryDate} at ${expiryTime} UTC (2 hours)\n\n` +
            `🌐 *Dashboard URL:*\n${dashboardUrl}\n\n` +
            `⚠️ *Security Notice:*\n` +
            `• This dashboard shows ONLY "${linkDisplay}" analytics\n` +
            `• Password expires in 2 hours\n` +
            `• Don't share your credentials\n` +
            `• Access is private and read-only`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌐 Open Dashboard', url: dashboardUrl }],
                [
                  {
                    text: '🔄 Create Another Dashboard',
                    callback_data: 'dashboard:new',
                  },
                ],
              ],
            },
          },
        );

        this.logger.log(
          `Generated dashboard for merchant ${merchant._id}, link ${paymentLinkId}`,
        );
      } catch (error) {
        this.logger.error(
          `Error generating dashboard: ${error.message}`,
          error.stack,
        );
        await ctx.reply(
          '❌ Error generating dashboard access. Please try again.',
        );
      }
    }

    // Handle "Create Another Dashboard" button
    if (callbackData === 'dashboard:new') {
      try {
        await ctx.answerCbQuery();
        await this.handle(ctx);
      } catch (error) {
        this.logger.error(
          `Error showing payment links: ${error.message}`,
          error.stack,
        );
        await ctx.answerCbQuery('Error loading payment links');
      }
    }
  }
}
