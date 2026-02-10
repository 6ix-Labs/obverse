import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  Logger,
  ConflictException,
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
  ): Promise<PaymentDocument> {
    try {
      this.logger.log(
        `Creating payment for link ${createPaymentDto.linkCode} with tx ${createPaymentDto.txSignature}`,
      );

      const payment =
        await this.paymentsService.createPaymentFromFrontend(createPaymentDto);

      this.logger.log(`Payment created successfully: ${payment._id}`);
      return payment;
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
}
