import { Injectable } from '@nestjs/common';
import { MerchantService } from 'src/merchants/merchants.service';
import { PaymentLinksService } from 'src/payment-links/payment-links.service';
import { PaymentsService } from 'src/payments/payments.service';

@Injectable()
export class ViewLinkHandler {
  constructor(
    private merchantsService: MerchantService,
    private paymentLinksService: PaymentLinksService,
    private paymentsService: PaymentsService,
  ) {}
  async handle(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.reply(`⚠️ Please set up your account with /start`);
      return;
    }

    // Extract linkId from command
    const commandText = ctx.message?.text || '';
    const linkId = commandText.split(' ')[1];

    if (!linkId) {
      await ctx.reply(
        `❌ Please provide a link ID.\n\n` +
          `Usage: \`/link <id>\`\n` +
          `Example: \`/link x7k9m2\``,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    await this.showLinkDetails(ctx, linkId, merchant._id.toString());
  }

  async handleCallback(ctx: any, linkId: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account with /start');
      return;
    }

    await ctx.answerCbQuery();
    await this.showLinkDetails(ctx, linkId, merchant._id.toString());
  }

  private async showLinkDetails(ctx: any, linkId: string, merchantId: string) {
    try {
      const link = await this.paymentLinksService.findByLinkId(linkId);

      // Verify ownership
      if (link.merchantId.toString() !== merchantId) {
        await ctx.reply(`❌ You don't have access to this payment link.`);
        return;
      }

      const payments = await this.paymentsService.findByPaymentLinkId(
        link._id.toString(),
      );

      const confirmedPayments = payments.filter(
        (p) => p.status === 'confirmed',
      );
      const totalAmount = confirmedPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      const paymentUrl = `${process.env.APP_URL}/pay/${link.linkId}`;
      const status = link.isActive ? '✅ Active' : '❌ Inactive';
      const type = link.isReusable ? '🔄 Reusable' : '1️⃣ One-time';

      const fieldsText =
        link.customFields.length > 0
          ? link.customFields.map((f) => f.fieldName).join(', ')
          : 'None';

      const expiryText = link.expiresAt
        ? `⏰ Expires: ${link.expiresAt.toLocaleString()}`
        : '⏰ Never expires';

      const message =
        `📊 Payment Link Details\n\n` +
        `${status} | ${type}\n` +
        `💵 Amount: ${link.amount} ${link.token}\n` +
        `${link.description ? `📋 Description: ${link.description}\n` : ''}` +
        `📝 Collects: ${fieldsText}\n` +
        `${expiryText}\n\n` +
        `📈 Stats:\n` +
        `• Total Payments: ${confirmedPayments.length}\n` +
        `• Total Amount: ${totalAmount} ${link.token}\n` +
        `• Pending: ${payments.filter((p) => p.status === 'pending').length}\n` +
        // `• Created: ${link.createdAt.toLocaleDateString()}\n` +
        `${link.lastPaidAt ? `• Last paid: ${link.lastPaidAt.toLocaleString()}\n` : ''}\n` +
        `🔗 Link:\n\`${paymentUrl}\``;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📋 Copy Link', url: paymentUrl },
            { text: '💳 Recent Payments', callback_data: `payments:${linkId}` },
          ],
          [
            link.isActive
              ? { text: '🔴 Deactivate', callback_data: `deactivate:${linkId}` }
              : { text: '🟢 Activate', callback_data: `activate:${linkId}` },
            { text: '🗑️ Delete', callback_data: `delete:${linkId}` },
          ],
          [{ text: '« Back to Links', callback_data: 'back_to_links' }],
        ],
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      await ctx.reply(`❌ Payment link not found or expired.`);
    }
  }

  async showRecentPayments(ctx: any, linkId: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account');
      return;
    }

    await ctx.answerCbQuery();

    try {
      const link = await this.paymentLinksService.findByLinkId(linkId);
      const payments = await this.paymentsService.findByPaymentLinkId(
        link._id.toString(),
      );

      if (payments.length === 0) {
        await ctx.reply(`📭 No payments yet for this link.`);
        return;
      }

      const recentPayments = payments.slice(0, 10);
      let message = `💳 Recent Payments (${payments.length} total)\n\n`;

      recentPayments.forEach((payment, index) => {
        const statusEmoji = payment.status === 'confirmed' ? '✅' : '⏳';
        const customerInfo =
          payment.customerData.name ||
          payment.customerData.email ||
          'Anonymous';

        message +=
          `${index + 1}. ${statusEmoji} ${payment.amount} ${payment.token}\n` +
          `   ${customerInfo}\n` +
          `   ${payment.createdAt ? payment.createdAt.toLocaleString() : 'Unknown date'}\n\n`;
      });

      const keyboard = {
        inline_keyboard: [
          [{ text: '« Back to Link Details', callback_data: `view:${linkId}` }],
        ],
      };

      await ctx.reply(message, { reply_markup: keyboard });
    } catch (error) {
      await ctx.reply(`❌ Could not load payments.`);
    }
  }

  async handleDeactivate(ctx: any, linkId: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account');
      return;
    }

    await ctx.answerCbQuery();

    try {
      await this.paymentLinksService.deactivateLink(
        linkId,
        merchant._id.toString(),
      );
      await ctx.reply(`✅ Payment link deactivated successfully.`);
      // Show updated link details
      await this.showLinkDetails(ctx, linkId, merchant._id.toString());
    } catch (error) {
      await ctx.reply(`❌ Failed to deactivate link.`);
    }
  }

  async handleActivate(ctx: any, linkId: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account');
      return;
    }

    await ctx.answerCbQuery();

    try {
      // Activate the link (we need to add this method to the service)
      const link = await this.paymentLinksService.findByLinkId(linkId);

      // Verify ownership
      if (link.merchantId.toString() !== merchant._id.toString()) {
        await ctx.reply(`❌ You don't have access to this payment link.`);
        return;
      }

      link.isActive = true;
      await link.save();

      await ctx.reply(`✅ Payment link activated successfully.`);
      // Show updated link details
      await this.showLinkDetails(ctx, linkId, merchant._id.toString());
    } catch (error) {
      await ctx.reply(`❌ Failed to activate link.`);
    }
  }

  async handleDelete(ctx: any, linkId: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account');
      return;
    }

    await ctx.answerCbQuery();

    // Show confirmation
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Yes, Delete', callback_data: `confirm_delete:${linkId}` },
          { text: '❌ Cancel', callback_data: `view:${linkId}` },
        ],
      ],
    };

    await ctx.reply(
      `⚠️ Are you sure you want to delete this payment link?\n\n` +
        `This action cannot be undone. All associated payment data will be preserved, but the link will no longer be accessible.`,
      { reply_markup: keyboard },
    );
  }

  async handleConfirmDelete(ctx: any, linkId: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account');
      return;
    }

    await ctx.answerCbQuery();

    try {
      // Delete the link (deactivate it permanently)
      await this.paymentLinksService.deactivateLink(
        linkId,
        merchant._id.toString(),
      );
      await ctx.reply(`✅ Payment link deleted successfully.`);
    } catch (error) {
      await ctx.reply(`❌ Failed to delete link.`);
    }
  }
}
