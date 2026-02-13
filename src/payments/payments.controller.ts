import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaymentDocument } from './schemas/payments.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentReceiptDto } from './dto/receipt.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Submit a payment from the frontend after blockchain transaction
   * POST /payments
   */
  @Post()
  @ApiOperation({
    summary: 'Create a payment',
    description:
      'Submit a payment record after blockchain transaction is completed. This endpoint verifies the transaction and creates a payment record.',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439013',
        linkCode: 'x7k9m2',
        paymentLinkId: '507f1f77bcf86cd799439012',
        merchantId: '507f1f77bcf86cd799439011',
        txSignature: '5j7s...9k2m',
        chain: 'solana',
        amount: 50,
        token: 'USDC',
        fromAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        toAddress: '9yZXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        status: 'completed',
        isConfirmed: true,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or invalid data',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - payment with this transaction signature already exists',
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<any> {
    try {
      this.logger.log(
        `Creating payment for link ${createPaymentDto.linkCode} with tx ${createPaymentDto.txSignature}`,
      );

      const payment =
        await this.paymentsService.createPaymentFromFrontend(createPaymentDto);

      this.logger.log(`Payment created successfully: ${payment._id}`);
      const paymentObject =
        typeof (payment as any).toObject === 'function'
          ? (payment as any).toObject()
          : payment;

      let receipt: any;
      try {
        receipt = await this.paymentsService.buildReceiptFromPayment(payment);
      } catch (receiptError) {
        // Do not fail payment creation if receipt enrichment fails.
        this.logger.warn(
          `Payment created but receipt enrichment failed for ${payment._id}: ${receiptError.message}`,
        );

        receipt = {
          receiptId: payment._id.toString(),
          paymentId: payment._id.toString(),
          linkCode: createPaymentDto.linkCode,
          txSignature: payment.txSignature,
          amount: payment.amount,
          token: payment.token,
          chain: payment.chain,
          fromAddress: payment.fromAddress,
          toAddress: payment.toAddress,
          status: payment.status,
          isConfirmed: payment.status === 'confirmed',
          confirmedAt: payment.confirmedAt,
          createdAt: payment.createdAt,
          dashboardUrl: process.env.DASHBOARD_URL || 'https://www.obverse.cc/dashboard',
          explorerUrl:
            payment.chain?.toLowerCase() === 'solana'
              ? `https://solscan.io/tx/${payment.txSignature}`
              : `https://monadscan.com/tx/${payment.txSignature}`,
          customerData: payment.customerData,
        };
      }

      return {
        ...paymentObject,
        isConfirmed: payment.status === 'confirmed',
        receipt,
      };
    } catch (error) {
      this.logger.error(
        `Error creating payment: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create payment');
    }
  }

  /**
   * Get all payments for a specific payment link by link code
   * GET /payments/link/:linkCode
   */
  @Get('link/:linkCode')
  @ApiOperation({
    summary: 'Get payments by link code',
    description:
      'Retrieve all payments associated with a specific payment link code',
  })
  @ApiParam({
    name: 'linkCode',
    description: 'Payment link code',
    example: 'x7k9m2',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payments retrieved successfully',
    schema: {
      example: [
        {
          _id: '507f1f77bcf86cd799439013',
          linkCode: 'x7k9m2',
          paymentLinkId: '507f1f77bcf86cd799439012',
          merchantId: '507f1f77bcf86cd799439011',
          txSignature: '5j7s...9k2m',
          chain: 'solana',
          amount: 50,
          token: 'USDC',
          status: 'completed',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment link code format',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment link not found',
  })
  async getPaymentsByLinkCode(
    @Param('linkCode') linkCode: string,
  ): Promise<PaymentDocument[]> {
    try {
      // Validate linkCode parameter
      if (!linkCode || linkCode.trim().length === 0) {
        throw new BadRequestException('Payment link code is required');
      }

      if (linkCode.length < 6 || linkCode.length > 20) {
        throw new BadRequestException('Invalid payment link code format');
      }

      this.logger.log(`Fetching payments for link: ${linkCode}`);

      const payments =
        await this.paymentsService.findByPaymentLinkCode(linkCode);

      this.logger.log(
        `Found ${payments.length} payments for link: ${linkCode}`,
      );
      return payments;
    } catch (error) {
      this.logger.error(
        `Error fetching payments for link ${linkCode}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get payment receipt by payment ID
   * GET /payments/:paymentId/receipt
   */
  @Get(':paymentId/receipt')
  @ApiOperation({
    summary: 'Get payment receipt',
    description:
      'Retrieve a canonical receipt for a payment. Use this for agent-facing payment confirmations.',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment document ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment receipt retrieved successfully',
    type: PaymentReceiptDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async getPaymentReceipt(
    @Param('paymentId') paymentId: string,
  ): Promise<PaymentReceiptDto> {
    try {
      return await this.paymentsService.getReceiptByPaymentId(paymentId);
    } catch (error) {
      this.logger.error(
        `Error fetching receipt for payment ${paymentId}: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve payment receipt');
    }
  }
}
