import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ShareController } from '../src/share/share.controller';
import { ShareService } from '../src/share/share.service';

describe('Share Endpoints (e2e)', () => {
    let app: INestApplication;

    const shareServiceMock = {
        getPaymentShareMeta: jest.fn().mockResolvedValue({
            title: 'Pay 50 USDC',
            description: 'Invoice payment',
            pageUrl: 'https://www.obverse.cc/share/payment/x7k9m2',
            imageUrl: 'https://www.obverse.cc/preview/link/x7k9m2',
            redirectUrl: 'https://www.obverse.cc/pay/x7k9m2',
        }),
        getReceiptShareMeta: jest.fn().mockResolvedValue({
            title: 'Receipt • 50 USDC',
            description: 'Status: confirmed. Transaction receipt for x7k9m2.',
            pageUrl: 'https://www.obverse.cc/share/receipt/507f1f77bcf86cd799439013',
            imageUrl:
                'https://www.obverse.cc/preview/receipt/507f1f77bcf86cd799439013?v=confirmed',
            redirectUrl: 'https://www.obverse.cc/receipt/507f1f77bcf86cd799439013',
        }),
        getDashboardShareMeta: jest.fn().mockResolvedValue({
            title: 'Dashboard • Invoice payment',
            description: 'Payment analytics dashboard for x7k9m2.',
            pageUrl: 'https://www.obverse.cc/share/dashboard/507f1f77bcf86cd799439012',
            imageUrl:
                'https://www.obverse.cc/preview/dashboard/507f1f77bcf86cd799439012?expires=1760730000&signature=signed',
            redirectUrl: 'https://www.obverse.cc/dashboard',
        }),
        getMissingShareMeta: jest.fn().mockImplementation((type: string) => ({
            title: 'Obverse',
            description: `The requested ${type} resource was not found.`,
            pageUrl: `https://www.obverse.cc/share/${type}`,
            imageUrl: 'https://www.obverse.cc/preview/fallback',
            redirectUrl: 'https://www.obverse.cc',
        })),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [ShareController],
            providers: [{ provide: ShareService, useValue: shareServiceMock }],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /share/payment/:linkCode returns HTML with required OG/Twitter tags and redirect', async () => {
        const response = await request
            .default(app.getHttpServer())
            .get('/share/payment/x7k9m2')
            .expect(200)
            .expect('Content-Type', /text\/html/)
            .expect('Cache-Control', /max-age=60/);

        const html = response.text;
        expect(html).toContain('property="og:type" content="website"');
        expect(html).toContain('property="og:title" content="Pay 50 USDC"');
        expect(html).toContain(
            'property="og:description" content="Invoice payment"',
        );
        expect(html).toContain(
            'property="og:url" content="https://www.obverse.cc/share/payment/x7k9m2"',
        );
        expect(html).toContain(
            'property="og:image" content="https://www.obverse.cc/preview/link/x7k9m2"',
        );
        expect(html).toContain('property="og:image:width" content="1200"');
        expect(html).toContain('property="og:image:height" content="630"');
        expect(html).toContain('name="twitter:card" content="summary_large_image"');
        expect(html).toContain('name="twitter:title" content="Pay 50 USDC"');
        expect(html).toContain(
            'name="twitter:image" content="https://www.obverse.cc/preview/link/x7k9m2"',
        );
        expect(html).toContain(
            'http-equiv="refresh" content="0;url=https://www.obverse.cc/pay/x7k9m2"',
        );
        expect(html).toContain('window.location.replace("https://www.obverse.cc/pay/x7k9m2")');
    });

    it('GET /share/dashboard/:dashboardId maps dashboard image and redirects to /dashboard', async () => {
        const response = await request
            .default(app.getHttpServer())
            .get('/share/dashboard/507f1f77bcf86cd799439012')
            .expect(200);

        const html = response.text;
        expect(html).toContain(
            'property="og:image" content="https://www.obverse.cc/preview/dashboard/507f1f77bcf86cd799439012?expires=1760730000&amp;signature=signed"',
        );
        expect(html).toContain(
            'http-equiv="refresh" content="0;url=https://www.obverse.cc/dashboard"',
        );
    });

    it('GET /share/payment/:linkCode returns 404 HTML with fallback tags when entity is missing', async () => {
        shareServiceMock.getPaymentShareMeta.mockRejectedValueOnce(
            new NotFoundException('Payment link not found'),
        );

        const response = await request
            .default(app.getHttpServer())
            .get('/share/payment/missing')
            .expect(404)
            .expect('Content-Type', /text\/html/);

        const html = response.text;
        expect(html).toContain('property="og:title" content="Obverse"');
        expect(html).toContain(
            'property="og:image" content="https://www.obverse.cc/preview/fallback"',
        );
        expect(html).toContain('The requested payment resource was not found.');
    });
});
