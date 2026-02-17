import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentLinksService } from '../payment-links/payment-links.service';
import { PaymentsService } from '../payments/payments.service';
import {
  DashboardPreviewData,
  LinkPreviewData,
  ReceiptPreviewData,
} from './types/preview.types';
import { truncateHash } from '../common/utils/preview-cache.util';

@Injectable()
export class PreviewDataService {
  private readonly logger = new Logger(PreviewDataService.name);

  constructor(
    private readonly paymentLinksService: PaymentLinksService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getLinkPreviewData(linkCode: string): Promise<LinkPreviewData> {
    const link =
      await this.paymentLinksService.findByLinkIdWithMerchant(linkCode);

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    const merchant: any = link.merchantId;
    const merchantName =
      merchant?.username ||
      [merchant?.firstName, merchant?.lastName].filter(Boolean).join(' ') ||
      'Merchant';

    return {
      linkCode: link.linkId,
      merchantName,
      amount: link.amount,
      token: link.token,
      chain: link.chain,
      description: link.description,
      logoUrl: merchant?.logoUrl,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  async getReceiptPreviewData(paymentId: string): Promise<ReceiptPreviewData> {
    const payment = await this.paymentsService.findById(paymentId);

    return {
      paymentId: payment._id.toString(),
      amount: payment.amount,
      token: payment.token,
      chain: payment.chain,
      status: payment.status,
      txHashTruncated: truncateHash(payment.txSignature, 8),
      createdAt: payment.createdAt,
      confirmedAt: payment.confirmedAt,
      updatedAt: payment.updatedAt,
    };
  }

  async getDashboardPreviewData(
    dashboardId: string,
    dateRange?: { start?: Date; end?: Date },
  ): Promise<DashboardPreviewData> {
    const link = await this.paymentLinksService.findById(dashboardId);
    if (!link) {
      throw new NotFoundException('Dashboard not found');
    }

    const start =
      dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = dateRange?.end || new Date();

    const stats = await this.paymentsService.getPaymentLinkStats(
      link._id.toString(),
      {
        startDate: start,
        endDate: end,
      },
    );

    return {
      dashboardId: link._id.toString(),
      dateRange: { start, end },
      totalVolume: stats.totalVolume,
      successfulCount: stats.successfulCount,
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
      currency: link.token,
      updatedAt: stats.updatedAt || link.updatedAt,
    };
  }
}
