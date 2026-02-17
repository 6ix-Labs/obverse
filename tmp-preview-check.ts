import sharp from 'sharp';
import { PreviewTemplateService } from './src/preview/preview-template.service';
import { PreviewImageAdapter } from './src/preview/adapters/preview-image.adapter';

async function main() {
  const template = new PreviewTemplateService();
  const adapter = new PreviewImageAdapter();

  const cases = [
    {
      name: 'link',
      svg: template.renderLinkSvg({
        linkCode: 'x7k9m2',
        merchantName: 'Acme Merchant',
        amount: 150.75,
        token: 'USDC',
        chain: 'base',
        description: 'Premium package payment',
      }),
    },
    {
      name: 'receipt',
      svg: template.renderReceiptSvg({
        paymentId: '507f1f77bcf86cd799439013',
        amount: 150.75,
        token: 'USDC',
        chain: 'base',
        status: 'confirmed',
        txHashTruncated: '0xabc123...def456',
        createdAt: new Date('2026-02-17T10:00:00.000Z'),
        confirmedAt: new Date('2026-02-17T10:01:10.000Z'),
      }),
    },
    {
      name: 'dashboard',
      svg: template.renderDashboardSvg({
        dashboardId: '507f1f77bcf86cd799439012',
        dateRange: {
          start: new Date('2026-02-01T00:00:00.000Z'),
          end: new Date('2026-02-17T23:59:59.000Z'),
        },
        totalVolume: 12450.33,
        successfulCount: 120,
        pendingCount: 7,
        failedCount: 3,
        currency: 'USDC',
      }),
    },
    { name: 'not-found', svg: template.renderNotFoundSvg() },
    { name: 'fallback', svg: template.renderFallbackSvg() },
  ];

  for (const item of cases) {
    const png = await adapter.renderSvgToPng(item.svg, 1200, 630, 3000);
    const meta = await sharp(png).metadata();
    console.log(JSON.stringify({ type: item.name, format: meta.format, width: meta.width, height: meta.height, bytes: png.length }));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
