import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { PaymentLinkDocument } from './schemas/payment-links.schema';

@Injectable()
export class OGImageService {
  private readonly logger = new Logger(OGImageService.name);
  private readonly imageWidth = 1200;
  private readonly imageHeight = 630;

  async generateOGImage(paymentLink: PaymentLinkDocument): Promise<Buffer> {
    try {
      const { amount, token, chain, description } = paymentLink;

      // Create SVG with payment details
      const svg = this.generateSVG(amount, token, chain, description);

      // Convert SVG to PNG using sharp
      const image = await sharp(Buffer.from(svg))
        .resize(this.imageWidth, this.imageHeight)
        .png()
        .toBuffer();

      this.logger.log(`OG image generated for link: ${paymentLink.linkId}`);
      return image;
    } catch (error) {
      this.logger.error(
        `Error generating OG image: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private generateSVG(
    amount: number,
    token: string,
    chain: string,
    description?: string,
  ): string {
    // Format amount with commas
    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });

    // Truncate description if too long
    const displayDescription = description
      ? description.length > 80
        ? description.substring(0, 77) + '...'
        : description
      : 'Payment Request';

    // Get chain color
    const chainColor = this.getChainColor(chain);

    return `
      <svg width="${this.imageWidth}" height="${this.imageHeight}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background gradient -->
        <defs>
          <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="card-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f3460;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#16213e;stop-opacity:0.8" />
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bg-gradient)"/>

        <!-- Card container -->
        <rect x="100" y="100" width="1000" height="430" rx="20" fill="url(#card-gradient)" stroke="${chainColor}" stroke-width="3"/>

        <!-- Obverse Logo/Brand -->
        <text x="150" y="180" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff">
          OBVERSE
        </text>

        <!-- Chain badge -->
        <rect x="150" y="200" width="${chain.length * 20 + 40}" height="40" rx="20" fill="${chainColor}"/>
        <text x="${150 + (chain.length * 20 + 40) / 2}" y="227"
              font-family="Arial, sans-serif" font-size="20" font-weight="bold"
              fill="#ffffff" text-anchor="middle">
          ${chain.toUpperCase()}
        </text>

        <!-- Amount -->
        <text x="150" y="320" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#4ecca3">
          ${formattedAmount} ${token}
        </text>

        <!-- Description -->
        <text x="150" y="390" font-family="Arial, sans-serif" font-size="28" fill="#a8b2d1">
          ${this.escapeXml(displayDescription)}
        </text>

        <!-- Payment Request Label -->
        <text x="150" y="480" font-family="Arial, sans-serif" font-size="24" fill="#8892b0">
          Crypto Payment Request
        </text>
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
    };
    return colorMap[chain.toLowerCase()] || '#4ecca3';
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
        default:
          return c;
      }
    });
  }
}
