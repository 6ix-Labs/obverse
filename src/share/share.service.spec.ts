import { NotFoundException } from '@nestjs/common';
import { ShareService } from './share.service';

describe('ShareService', () => {
    const paymentLinksServiceMock = {
        findByLinkIdWithMerchant: jest.fn(),
        findById: jest.fn(),
    };

    const paymentsServiceMock = {
        findById: jest.fn(),
        buildReceiptFromPayment: jest.fn(),
    };

    const previewSigningServiceMock = {
        getSignatureMaxTtlSeconds: jest.fn().mockReturnValue(900),
        getDashboardSignature: jest.fn().mockReturnValue('signed-hmac'),
    };

    const configServiceMock = {
        get: jest.fn().mockImplementation((key: string) => {
            const values: Record<string, any> = {
                APP_URL: 'https://www.obverse.cc',
                'preview.baseUrl': 'https://www.obverse.cc',
            };
            return values[key];
        }),
    };

    const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('www.obverse.cc'),
    } as any;

    let service: ShareService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ShareService(
            paymentLinksServiceMock as any,
            paymentsServiceMock as any,
            previewSigningServiceMock as any,
            configServiceMock as any,
        );
    });

    it('maps payment entity fields to share meta tags values', async () => {
        paymentLinksServiceMock.findByLinkIdWithMerchant.mockResolvedValueOnce({
            linkId: 'x7k9m2',
            amount: 50,
            token: 'USDC',
            chain: 'solana',
            description: 'Invoice payment',
        });

        const result = await service.getPaymentShareMeta('x7k9m2', req);

        expect(result.title).toBe('Pay 50 USDC');
        expect(result.description).toBe('Invoice payment');
        expect(result.pageUrl).toBe('https://www.obverse.cc/share/payment/x7k9m2');
        expect(result.imageUrl).toBe('https://www.obverse.cc/preview/link/x7k9m2');
        expect(result.redirectUrl).toBe('https://www.obverse.cc/pay/x7k9m2');
    });

    it('uses receipt.previewImageUrl exactly as provided by backend', async () => {
        paymentsServiceMock.findById.mockResolvedValueOnce({
            _id: '507f1f77bcf86cd799439013',
        });
        paymentsServiceMock.buildReceiptFromPayment.mockResolvedValueOnce({
            amount: 50,
            token: 'USDC',
            status: 'confirmed',
            linkCode: 'x7k9m2',
            previewImageUrl:
                'https://www.obverse.cc/preview/receipt/507f1f77bcf86cd799439013?v=confirmed',
        });

        const result = await service.getReceiptShareMeta(
            '507f1f77bcf86cd799439013',
            req,
        );

        expect(result.imageUrl).toBe(
            'https://www.obverse.cc/preview/receipt/507f1f77bcf86cd799439013?v=confirmed',
        );
        expect(result.redirectUrl).toBe(
            'https://www.obverse.cc/receipt/507f1f77bcf86cd799439013',
        );
    });

    it('builds signed dashboard preview URL and redirects humans to /dashboard', async () => {
        paymentLinksServiceMock.findById.mockResolvedValueOnce({
            _id: { toString: () => '507f1f77bcf86cd799439012' },
            linkId: 'x7k9m2',
            amount: 50,
            token: 'USDC',
            description: 'Invoice payment',
            merchantId: { toString: () => '507f1f77bcf86cd799439011' },
        });

        const result = await service.getDashboardShareMeta(
            '507f1f77bcf86cd799439012',
            req,
        );

        expect(previewSigningServiceMock.getDashboardSignature).toHaveBeenCalled();
        expect(result.imageUrl).toContain('/preview/dashboard/507f1f77bcf86cd799439012?expires=');
        expect(result.imageUrl).toContain('&signature=signed-hmac');
        expect(result.redirectUrl).toBe('https://www.obverse.cc/dashboard');
    });

    it('throws when receipt has no preview image URL', async () => {
        paymentsServiceMock.findById.mockResolvedValueOnce({
            _id: '507f1f77bcf86cd799439013',
        });
        paymentsServiceMock.buildReceiptFromPayment.mockResolvedValueOnce({
            amount: 50,
            token: 'USDC',
            status: 'confirmed',
            linkCode: 'x7k9m2',
            previewImageUrl: undefined,
        });

        await expect(
            service.getReceiptShareMeta('507f1f77bcf86cd799439013', req),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});
