import { Injectable } from '@nestjs/common';
import { PaymentLinkDocument } from './schemas/payment-links.schema';

@Injectable()
export class OGTemplateService {
  generateHTML(paymentLink: PaymentLinkDocument, baseUrl: string): string {
    const { linkId, amount, token, description, chain } = paymentLink;

    const title = `Payment Request: ${amount} ${token}`;
    const pageDescription = description || `Pay ${amount} ${token} on ${chain}`;
    const previewBaseUrl = process.env.PREVIEW_BASE_URL || baseUrl;
    const imageUrl = `${previewBaseUrl}/preview/link/${linkId}`;
    const pageUrl = `${baseUrl}/payment-links/${linkId}`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Primary Meta Tags -->
    <title>${this.escapeHtml(title)}</title>
    <meta name="title" content="${this.escapeHtml(title)}">
    <meta name="description" content="${this.escapeHtml(pageDescription)}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${this.escapeHtml(title)}">
    <meta property="og:description" content="${this.escapeHtml(pageDescription)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${pageUrl}">
    <meta property="twitter:title" content="${this.escapeHtml(title)}">
    <meta property="twitter:description" content="${this.escapeHtml(pageDescription)}">
    <meta property="twitter:image" content="${imageUrl}">

    <!-- Telegram -->
    <meta property="telegram:image" content="${imageUrl}">

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            width: 100%;
            background: rgba(15, 52, 96, 0.6);
            border: 2px solid ${this.getChainColor(chain)};
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            backdrop-filter: blur(10px);
        }

        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #ffffff;
        }

        .chain-badge {
            display: inline-block;
            background: ${this.getChainColor(chain)};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 30px;
        }

        .amount {
            font-size: 48px;
            font-weight: bold;
            color: #4ecca3;
            margin: 20px 0;
        }

        .token {
            font-size: 24px;
            color: #4ecca3;
            margin-left: 10px;
        }

        .description {
            font-size: 18px;
            color: #a8b2d1;
            margin: 20px 0;
            line-height: 1.6;
        }

        .label {
            font-size: 16px;
            color: #8892b0;
            margin-top: 30px;
        }

        .redirect-notice {
            margin-top: 30px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            font-size: 14px;
            color: #a8b2d1;
        }

        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #4ecca3;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">OBVERSE</div>
        <div class="chain-badge">${chain.toUpperCase()}</div>

        <div class="amount">
            ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            <span class="token">${token}</span>
        </div>

        ${description ? `<div class="description">${this.escapeHtml(description)}</div>` : ''}

        <div class="label">Crypto Payment Request</div>

        <div class="redirect-notice">
            <div class="spinner"></div>
            Redirecting to payment page...
        </div>
    </div>

    <script>
        // Redirect to frontend payment page after 2 seconds
        setTimeout(() => {
            // Update this URL to your frontend payment page
            const frontendUrl = '${process.env.FRONTEND_URL || 'https://www.obverse.cc'}';
            window.location.href = frontendUrl + '/pay/${linkId}';
        }, 2000);
    </script>
</body>
</html>
    `.trim();
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
}
