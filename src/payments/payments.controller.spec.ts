import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  const mockPaymentsService = {
    createPaymentFromFrontend: jest.fn(),
    findByPaymentLinkCode: jest.fn(),
    getReceiptByPaymentId: jest.fn(),
    buildReceiptFromPayment: jest.fn(),
  } as unknown as jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
    jest.clearAllMocks();
  });

  describe('getPaymentReceipt', () => {
    it('should return receipt when payment exists', async () => {
      const paymentId = '507f1f77bcf86cd799439013';
      const receipt = {
        receiptId: paymentId,
        paymentId,
        linkCode: 'x7k9m2',
        txSignature: '0xabc123',
        amount: 50,
        token: 'USDC',
        chain: 'monad',
        fromAddress: '0x1111111111111111111111111111111111111111',
        toAddress: '0x2222222222222222222222222222222222222222',
        status: 'confirmed',
        isConfirmed: true,
        confirmedAt: new Date('2026-02-13T18:22:10.000Z'),
        createdAt: new Date('2026-02-13T18:20:15.000Z'),
        dashboardUrl: 'https://www.obverse.cc/dashboard',
        explorerUrl: 'https://monadscan.com/tx/0xabc123',
        customerData: { email: 'alice@example.com' },
      };

      paymentsService.getReceiptByPaymentId.mockResolvedValue(receipt as any);

      const result = await controller.getPaymentReceipt(paymentId);

      expect(paymentsService.getReceiptByPaymentId).toHaveBeenCalledWith(
        paymentId,
      );
      expect(result).toEqual(receipt);
    });

    it('should rethrow bad request errors', async () => {
      paymentsService.getReceiptByPaymentId.mockRejectedValue(
        new BadRequestException('Invalid payment ID format'),
      );

      await expect(
        controller.getPaymentReceipt('invalid-id'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should rethrow not found errors', async () => {
      paymentsService.getReceiptByPaymentId.mockRejectedValue(
        new NotFoundException('Payment not found'),
      );

      await expect(
        controller.getPaymentReceipt('507f1f77bcf86cd799439013'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
