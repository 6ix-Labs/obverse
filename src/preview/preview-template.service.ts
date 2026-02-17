import { Injectable } from '@nestjs/common';
import {
  DashboardPreviewData,
  LinkPreviewData,
  ReceiptPreviewData,
} from './types/preview.types';

@Injectable()
export class PreviewTemplateService {
  private readonly width = 1200;
  private readonly height = 630;

  renderLinkSvg(data: LinkPreviewData): string {
    const amount = this.formatAmount(data.amount);
    const description = data.description
      ? this.truncate(data.description, 80)
      : 'Payment Request';

    return this.baseTemplate({
      title: data.merchantName || 'Obverse',
      subtitle: data.chain.toUpperCase(),
      amount: `${amount} ${data.token}`,
      description,
      badgeColor: this.getChainColor(data.chain),
      footer: 'Crypto Payment Link',
    });
  }

  renderReceiptSvg(data: ReceiptPreviewData): string {
    const statusColor = this.getStatusColor(data.status);
    const statusLabel = data.status.toUpperCase();
    const amount = this.formatAmount(data.amount);
    const timestamp = data.confirmedAt || data.createdAt;

    return this.baseTemplate({
      title: 'Payment Receipt',
      subtitle: `${data.chain.toUpperCase()} • ${statusLabel}`,
      amount: `${amount} ${data.token}`,
      description: `Tx ${this.escapeXml(data.txHashTruncated)}`,
      badgeColor: statusColor,
      footer: timestamp ? this.formatDate(timestamp) : ' ',
    });
  }

  renderDashboardSvg(data: DashboardPreviewData): string {
    const dateRange = `${this.formatDate(data.dateRange.start)} – ${this.formatDate(data.dateRange.end)}`;
    const totalVolume = this.formatAmount(data.totalVolume);

    return this.dashboardTemplate({
      dateRange,
      totalVolume,
      successful: data.successfulCount,
      pending: data.pendingCount,
      failed: data.failedCount,
      currency: data.currency || 'USDC',
    });
  }

  renderNotFoundSvg(message = 'Not Found'): string {
    return this.baseTemplate({
      title: 'Obverse Preview',
      subtitle: 'Resource Not Found',
      amount: message,
      description: 'The requested preview is unavailable.',
      badgeColor: '#ff5c5c',
      footer: 'Obverse',
    });
  }

  renderFallbackSvg(message = 'Preview Unavailable'): string {
    return this.baseTemplate({
      title: 'Obverse Preview',
      subtitle: 'Temporary Issue',
      amount: message,
      description: 'Please try again shortly.',
      badgeColor: '#ffb703',
      footer: 'Obverse',
    });
  }

  private baseTemplate(input: {
    title: string;
    subtitle: string;
    amount: string;
    description: string;
    badgeColor: string;
    footer: string;
  }): string {
    return `
      <svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
        <rect x="80" y="80" width="1040" height="470" rx="28" fill="#0b1220" stroke="${input.badgeColor}" stroke-width="3" />
        <text x="130" y="170" font-size="42" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#ffffff">${this.escapeXml(input.title)}</text>
        <rect x="130" y="190" width="${Math.max(180, input.subtitle.length * 16)}" height="42" rx="21" fill="${input.badgeColor}" />
        <text x="${130 + Math.max(180, input.subtitle.length * 16) / 2}" y="218" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="600" fill="#ffffff" text-anchor="middle">${this.escapeXml(input.subtitle)}</text>
        <text x="130" y="320" font-size="64" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#38bdf8">${this.escapeXml(input.amount)}</text>
        <text x="130" y="380" font-size="26" font-family="Inter, Arial, sans-serif" fill="#cbd5f5">${this.escapeXml(input.description)}</text>
        <text x="130" y="470" font-size="20" font-family="Inter, Arial, sans-serif" fill="#94a3b8">${this.escapeXml(input.footer)}</text>
        <text x="980" y="495" font-size="20" font-family="Inter, Arial, sans-serif" fill="#64748b">OBVERSE</text>
      </svg>
    `;
  }

  private dashboardTemplate(input: {
    dateRange: string;
    totalVolume: string;
    successful: number;
    pending: number;
    failed: number;
    currency: string;
  }): string {
    return `
      <svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
        <rect x="80" y="80" width="1040" height="470" rx="28" fill="#0b1220" stroke="#38bdf8" stroke-width="3" />
        <text x="130" y="170" font-size="42" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#ffffff">Dashboard Summary</text>
        <text x="130" y="210" font-size="22" font-family="Inter, Arial, sans-serif" fill="#94a3b8">${this.escapeXml(input.dateRange)}</text>
        <text x="130" y="300" font-size="58" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#22c55e">${this.escapeXml(input.totalVolume)} ${this.escapeXml(input.currency)}</text>

        <g font-family="Inter, Arial, sans-serif" font-size="24" fill="#cbd5f5">
          <text x="130" y="380">Successful: ${input.successful}</text>
          <text x="130" y="420">Pending: ${input.pending}</text>
          <text x="130" y="460">Failed: ${input.failed}</text>
        </g>
        <text x="980" y="495" font-size="20" font-family="Inter, Arial, sans-serif" fill="#64748b">OBVERSE</text>
      </svg>
    `;
  }

  private getChainColor(chain: string): string {
    const colorMap: Record<string, string> = {
      solana: '#14F195',
      ethereum: '#627EEA',
      base: '#0052FF',
      polygon: '#8247E5',
      arbitrum: '#28A0F0',
      optimism: '#FF0420',
      monad: '#7c3aed',
    };
    return colorMap[chain.toLowerCase()] || '#38bdf8';
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return '#22c55e';
      case 'failed':
        return '#ef4444';
      case 'pending':
      default:
        return '#f59e0b';
    }
  }

  private formatAmount(amount: number): string {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  private truncate(value: string, length: number): string {
    if (!value || value.length <= length) {
      return value;
    }
    return `${value.slice(0, length - 3)}...`;
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"\n\r]/g, (c) => {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case '\"':
          return '&quot;';
        case "'":
          return '&apos;';
        case '\n':
        case '\r':
          return ' ';
        default:
          return c;
      }
    });
  }
}
