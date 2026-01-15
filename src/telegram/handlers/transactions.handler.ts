import { Injectable } from '@nestjs/common';
import { MerchantService } from 'src/merchants/merchants.service';
import { TransactionsService } from 'src/transactions/transactions.service';
import { TransactionStatus, TransactionType } from 'src/transactions/schemas/transaction.schema';

@Injectable()
export class TransactionsHandler {
  constructor(
    private merchantsService: MerchantService,
    private transactionsService: TransactionsService,
  ) {}

  async handle(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.reply(`⚠️ Please set up your account with /start`);
      return;
    }

    await this.showTransactions(ctx, merchant._id.toString());
  }

  private async showTransactions(ctx: any, merchantId: string, page = 0) {
    const limit = 10;
    const skip = page * limit;

    const [transactions, stats, totalCount] = await Promise.all([
      this.transactionsService.findByMerchantId(merchantId, {
        limit,
        skip,
      }),
      this.transactionsService.getTransactionStats(merchantId),
      this.transactionsService.countByMerchant(merchantId),
    ]);

    if (transactions.length === 0 && page === 0) {
      await ctx.reply(
        `📊 Transaction History\n\n` +
          `You don't have any transactions yet.\n\n` +
          `Transactions will appear here when:\n` +
          `• You receive payments via payment links\n` +
          `• You perform token swaps\n` +
          `• You withdraw funds`,
      );
      return;
    }

    // Build message
    let message = `📊 Transaction History\n\n`;
    message += `💰 Total Volume: $${stats.totalVolume.toFixed(2)}\n`;
    message += `💵 Total Fees: $${stats.totalFees.toFixed(2)}\n`;
    message += `📈 Transactions: ${stats.totalTransactions}\n`;
    message += `⏳ Pending: ${stats.pendingTransactions}\n`;
    message += `✅ Confirmed: ${stats.confirmedTransactions}\n\n`;

    message += `Recent transactions:\n\n`;

    transactions.forEach((tx, index) => {
      const statusEmoji = tx.status === TransactionStatus.CONFIRMED ? '✅' : tx.status === TransactionStatus.PENDING ? '⏳' : '❌';
      const typeEmoji = this.getTypeEmoji(tx.type);

      let txLine = `${index + 1 + skip}. ${statusEmoji} ${typeEmoji} `;

      if (tx.type === TransactionType.SWAP) {
        txLine += `${tx.amount} ${tx.token} → ${tx.swapOutputAmount} ${tx.swapOutputToken}`;
      } else {
        txLine += `${tx.amount} ${tx.token}`;
      }

      txLine += ` (${tx.chain})`;

      message += txLine + `\n`;

      if (tx.description) {
        message += `   ${tx.description}\n`;
      }

      const sig = tx.txSignature.slice(0, 8) + '...' + tx.txSignature.slice(-8);
      message += `   \`${sig}\`\n\n`;
    });

    // Pagination buttons
    const buttons: any[] = [];
    const navRow: any[] = [];

    if (page > 0) {
      navRow.push({ text: '⬅️ Previous', callback_data: `tx_page:${page - 1}` });
    }

    if (skip + limit < totalCount) {
      navRow.push({ text: 'Next ➡️', callback_data: `tx_page:${page + 1}` });
    }

    if (navRow.length > 0) {
      buttons.push(navRow);
    }

    // Filter buttons
    buttons.push([
      { text: '💰 Payments', callback_data: 'tx_filter:payment_in' },
      { text: '🔄 Swaps', callback_data: 'tx_filter:swap' },
    ]);

    buttons.push([
      { text: '📊 Statistics', callback_data: 'tx_stats' },
      { text: '🔄 Refresh', callback_data: 'tx_refresh' },
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  }

  async handlePageChange(ctx: any, page: number) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account');
      return;
    }

    await ctx.answerCbQuery();
    await this.showTransactions(ctx, merchant._id.toString(), page);
  }

  async handleFilterChange(ctx: any, type: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account');
      return;
    }

    await ctx.answerCbQuery();

    const transactions = await this.transactionsService.findByMerchantId(
      merchant._id.toString(),
      {
        limit: 10,
        type: type as TransactionType,
      },
    );

    if (transactions.length === 0) {
      await ctx.reply(`No ${type} transactions found.`);
      return;
    }

    let message = `📊 ${this.getTypeLabel(type as TransactionType)} Transactions\n\n`;

    transactions.forEach((tx, index) => {
      const statusEmoji = tx.status === TransactionStatus.CONFIRMED ? '✅' : tx.status === TransactionStatus.PENDING ? '⏳' : '❌';

      let txLine = `${index + 1}. ${statusEmoji} `;

      if (tx.type === TransactionType.SWAP) {
        txLine += `${tx.amount} ${tx.token} → ${tx.swapOutputAmount} ${tx.swapOutputToken}`;
      } else {
        txLine += `${tx.amount} ${tx.token}`;
      }

      message += txLine + `\n`;
      if (tx.createdAt) {
        message += `   ${new Date(tx.createdAt).toLocaleString()}\n\n`;
      } else {
        message += `\n`;
      }
    });

    const keyboard = {
      inline_keyboard: [[{ text: '« Back to All', callback_data: 'tx_refresh' }]],
    };

    await ctx.reply(message, { reply_markup: keyboard });
  }

  async showStats(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.answerCbQuery('Please set up your account');
      return;
    }

    await ctx.answerCbQuery();

    const stats = await this.transactionsService.getTransactionStats(
      merchant._id.toString(),
    );

    let message = `📊 Transaction Statistics\n\n`;

    message += `💰 Overall:\n`;
    message += `• Total Volume: $${stats.totalVolume.toFixed(2)}\n`;
    message += `• Total Fees: $${stats.totalFees.toFixed(2)}\n`;
    message += `• Total Transactions: ${stats.totalTransactions}\n\n`;

    message += `📈 By Status:\n`;
    message += `• ✅ Confirmed: ${stats.confirmedTransactions}\n`;
    message += `• ⏳ Pending: ${stats.pendingTransactions}\n`;
    message += `• ❌ Failed: ${stats.failedTransactions}\n\n`;

    if (Object.keys(stats.byType).length > 0) {
      message += `📋 By Type:\n`;
      Object.entries(stats.byType).forEach(([type, data]) => {
        message += `• ${this.getTypeEmoji(type as TransactionType)} ${this.getTypeLabel(type as TransactionType)}: ${data.count} ($${data.volume.toFixed(2)})\n`;
      });
      message += `\n`;
    }

    if (Object.keys(stats.byChain).length > 0) {
      message += `⛓️ By Chain:\n`;
      Object.entries(stats.byChain).forEach(([chain, data]) => {
        message += `• ${chain.toUpperCase()}: ${data.count} ($${data.volume.toFixed(2)})\n`;
      });
    }

    const keyboard = {
      inline_keyboard: [[{ text: '« Back', callback_data: 'tx_refresh' }]],
    };

    await ctx.reply(message, { reply_markup: keyboard });
  }

  private getTypeEmoji(type: TransactionType): string {
    const emojiMap: Record<string, string> = {
      [TransactionType.PAYMENT_IN]: '💰',
      [TransactionType.PAYMENT_OUT]: '💸',
      [TransactionType.SWAP]: '🔄',
      [TransactionType.WITHDRAWAL]: '🏦',
      [TransactionType.REFUND]: '↩️',
      [TransactionType.TRANSFER]: '↔️',
      [TransactionType.DEPOSIT]: '📥',
    };
    return emojiMap[type] || '📝';
  }

  private getTypeLabel(type: TransactionType): string {
    const labelMap: Record<string, string> = {
      [TransactionType.PAYMENT_IN]: 'Incoming Payment',
      [TransactionType.PAYMENT_OUT]: 'Outgoing Payment',
      [TransactionType.SWAP]: 'Swap',
      [TransactionType.WITHDRAWAL]: 'Withdrawal',
      [TransactionType.REFUND]: 'Refund',
      [TransactionType.TRANSFER]: 'Transfer',
      [TransactionType.DEPOSIT]: 'Deposit',
    };
    return labelMap[type] || type;
  }
}
