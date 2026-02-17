import { Test, TestingModule } from '@nestjs/testing';
import { PreviewDataService } from './preview-data.service';
import { PaymentLinksService } from '../payment-links/payment-links.service';
import { PaymentsService } from '../payments/payments.service';

describe('PreviewDataService', () => {
  let service: PreviewDataService;

  const paymentLinksService = {
    findByLinkIdWithMerchant: jest.fn(),
    findById: jest.fn(),
  };

  const paymentsService = {
    findById: jest.fn(),
    getPaymentLinkStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreviewDataService,
        { provide: PaymentLinksService, useValue: paymentLinksService },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    }).compile();

    service = module.get<PreviewDataService>(PreviewDataService);
    jest.clearAllMocks();
  });

  it('should not leak PII in receipt preview mapping', async () => {
    paymentsService.findById.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439013' },
      amount: 50,
      token: 'USDC',
      chain: 'monad',
      status: 'confirmed',
      txSignature:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      fromAddress: '0x1111111111111111111111111111111111111111',
      toAddress: '0x2222222222222222222222222222222222222222',
      customerData: { email: 'alice@example.com', privateNote: 'secret' },
      createdAt: new Date(),
      confirmedAt: new Date(),
      updatedAt: new Date(),
    });

    const mapped = await service.getReceiptPreviewData(
      '507f1f77bcf86cd799439013',
    );

    expect((mapped as any).fromAddress).toBeUndefined();
    expect((mapped as any).toAddress).toBeUndefined();
    expect((mapped as any).customerData).toBeUndefined();
    expect(mapped.txHashTruncated.length).toBeLessThan(66);
  });
});
