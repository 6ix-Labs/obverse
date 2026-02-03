import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PaymentLinksService } from '../payment-links/payment-links.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '../payments/schemas/payments.schema';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private paymentLinksService: PaymentLinksService,
    private transactionsService: TransactionsService,
    private paymentsService: PaymentsService,
  ) {}

  /**
   * Get payment link dashboard overview
   * Scoped to a specific payment link only
   */
  async getPaymentLinkOverview(merchantId: string, paymentLinkId: string) {
    this.logger.log(`Getting overview for payment link ${paymentLinkId} (merchant: ${merchantId})`);

    // Find and verify ownership
    const link = await this.paymentLinksService.findById(paymentLinkId);
    if (!link) {
      throw new UnauthorizedException('Payment link not found');
    }

    if (link.merchantId.toString() !== merchantId) {
      throw new UnauthorizedException('Access denied');
    }

    // Get all payments for this link to calculate stats
    const allPayments = await this.paymentsService.findByPaymentLinkId(link._id.toString());

    // Calculate payment stats
    const pendingPayments = allPayments.filter(p => p.status === PaymentStatus.PENDING).length;
    const confirmedPayments = allPayments.filter(p => p.status === PaymentStatus.CONFIRMED).length;
    const failedPayments = allPayments.filter(p => p.status === PaymentStatus.FAILED).length;
    const totalPayments = allPayments.length;

    // Calculate total amount from confirmed payments
    const totalAmount = allPayments
      .filter(p => p.status === PaymentStatus.CONFIRMED)
      .reduce((sum, p) => sum + p.amount, 0);

    const successRate = totalPayments > 0
      ? (confirmedPayments / totalPayments * 100).toFixed(2)
      : 0;

    return {
      paymentLink: {
        linkId: link.linkId,
        description: link.description,
        amount: link.amount,
        token: link.token,
        chain: link.chain,
        isActive: link.isActive,
        isReusable: link.isReusable,
        createdAt: link.createdAt,
      },
      stats: {
        totalPayments,
        totalAmount,
        pendingPayments,
        confirmedPayments,
        failedPayments,
        successRate: parseFloat(successRate as string),
        lastPaidAt: link.lastPaidAt,
      },
      recentPayments: allPayments.slice(0, 10),
      chartData: await this.getPaymentLinkChartData(link._id),
    };
  }

  /**
   * Get payments with pagination for the payment link
   */
  async getPayments(
    merchantId: string,
    paymentLinkId: string,
    limit: number = 50,
    skip: number = 0,
  ) {
    this.logger.log(`Getting payments for payment link ${paymentLinkId}, limit: ${limit}, skip: ${skip}`);

    // Verify ownership
    const link = await this.paymentLinksService.findById(paymentLinkId);
    if (!link || link.merchantId.toString() !== merchantId) {
      throw new UnauthorizedException('Access denied');
    }

    const allPayments = await this.paymentsService.findByPaymentLinkId(link._id.toString());
    const paginatedPayments = allPayments.slice(skip, skip + limit);

    return {
      payments: paginatedPayments,
      pagination: {
        total: allPayments.length,
        limit,
        skip,
        hasMore: skip + paginatedPayments.length < allPayments.length,
      },
    };
  }

  /**
   * Generate chart data for specific payment link
   */
  private async getPaymentLinkChartData(paymentLinkId: any) {
    const payments = await this.paymentsService.findByPaymentLinkId(paymentLinkId.toString());

    // Group by day
    const dailyData: Record<string, { date: string; count: number; amount: number }> = {};

    payments.forEach(payment => {
      if (payment.createdAt) {
        const day = payment.createdAt.toISOString().split('T')[0];
        if (!dailyData[day]) {
          dailyData[day] = { date: day, count: 0, amount: 0 };
        }
        dailyData[day].count++;
        dailyData[day].amount += payment.amount;
      }
    });

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }
}
