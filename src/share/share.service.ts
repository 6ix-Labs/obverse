import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PaymentLinksService } from '../payment-links/payment-links.service';
import { PaymentsService } from '../payments/payments.service';
import { PreviewSigningService } from '../preview/preview-signing.service';

export type ShareMeta = {
    title: string;
    description: string;
    pageUrl: string;
    imageUrl: string;
    redirectUrl: string;
};

@Injectable()
export class ShareService {
    constructor(
        private readonly paymentLinksService: PaymentLinksService,
        private readonly paymentsService: PaymentsService,
        private readonly previewSigningService: PreviewSigningService,
        private readonly configService: ConfigService,
    ) { }

    async getPaymentShareMeta(linkCode: string, req: Request): Promise<ShareMeta> {
        const link = await this.paymentLinksService.findByLinkIdWithMerchant(linkCode);
        const appBaseUrl = this.getAppBaseUrl(req);
        const previewBaseUrl = this.getPreviewBaseUrl(req);

        const title = `Pay ${link.amount} ${link.token}`;
        const description =
            link.description || `Secure payment on ${String(link.chain || 'solana').toUpperCase()}`;

        return {
            title,
            description,
            pageUrl: `${appBaseUrl}/share/payment/${link.linkId}`,
            imageUrl: `${previewBaseUrl}/preview/link/${link.linkId}`,
            redirectUrl: `${appBaseUrl}/pay/${link.linkId}`,
        };
    }

    async getReceiptShareMeta(paymentId: string, req: Request): Promise<ShareMeta> {
        const payment = await this.paymentsService.findById(paymentId);
        const receipt = await this.paymentsService.buildReceiptFromPayment(payment);

        const appBaseUrl = this.getAppBaseUrl(req);
        const previewBaseUrl = this.getPreviewBaseUrl(req);

        if (!receipt.previewImageUrl) {
            throw new NotFoundException('Receipt preview image is not available');
        }

        const title = `Receipt • ${receipt.amount} ${receipt.token}`;
        const description = `Status: ${receipt.status}. Transaction receipt for ${receipt.linkCode}.`;

        return {
            title,
            description,
            pageUrl: `${appBaseUrl}/share/receipt/${paymentId}`,
            imageUrl: receipt.previewImageUrl,
            redirectUrl: `${appBaseUrl}/receipt/${paymentId}`,
        };
    }

    async getDashboardShareMeta(
        dashboardId: string,
        req: Request,
    ): Promise<ShareMeta> {
        const link = await this.paymentLinksService.findById(dashboardId);
        const appBaseUrl = this.getAppBaseUrl(req);
        const previewBaseUrl = this.getPreviewBaseUrl(req);

        const expires =
            Math.floor(Date.now() / 1000) +
            this.previewSigningService.getSignatureMaxTtlSeconds();
        const path = `/preview/dashboard/${link._id.toString()}`;
        const signature = this.previewSigningService.getDashboardSignature(
            path,
            expires,
            link.merchantId?.toString(),
        );
        const imageUrl = `${previewBaseUrl}${path}?expires=${expires}&signature=${signature}`;

        const title = link.description
            ? `Dashboard • ${link.description}`
            : `Dashboard • ${link.amount} ${link.token}`;
        const description = `Payment analytics dashboard for ${link.linkId}.`;

        return {
            title,
            description,
            pageUrl: `${appBaseUrl}/share/dashboard/${dashboardId}`,
            imageUrl,
            redirectUrl: `${appBaseUrl}/dashboard`,
        };
    }

    getMissingShareMeta(type: 'payment' | 'receipt' | 'dashboard', req: Request): ShareMeta {
        const appBaseUrl = this.getAppBaseUrl(req);
        const previewBaseUrl = this.getPreviewBaseUrl(req);

        return {
            title: 'Obverse',
            description: `The requested ${type} resource was not found.`,
            pageUrl: `${appBaseUrl}/share/${type}`,
            imageUrl: `${previewBaseUrl}/preview/fallback`,
            redirectUrl: type === 'dashboard' ? `${appBaseUrl}/dashboard` : `${appBaseUrl}`,
        };
    }

    private getAppBaseUrl(req: Request): string {
        const configured =
            process.env.APP_URL || this.configService.get<string>('APP_URL');

        if (configured) {
            return configured.replace(/\/$/, '');
        }

        return `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
    }

    private getPreviewBaseUrl(req: Request): string {
        const configured =
            process.env.PREVIEW_BASE_URL ||
            this.configService.get<string>('preview.baseUrl');

        if (configured) {
            return configured.replace(/\/$/, '');
        }

        return this.getAppBaseUrl(req);
    }
}
