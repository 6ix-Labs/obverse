import { Controller, Get, Post, Body, Param, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentDocument } from './schemas/payments.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Submit a payment from the frontend after blockchain transaction
   * POST /payments
   */
  @Post()
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentDocument> {
    try {
      this.logger.log(
        `Creating payment for link ${createPaymentDto.linkCode} with tx ${createPaymentDto.txSignature}`,
      );

      const payment = await this.paymentsService.createPaymentFromFrontend(
        createPaymentDto,
      );

      this.logger.log(`Payment created successfully: ${payment._id}`);
      return payment;
    } catch (error) {
      this.logger.error(
        `Error creating payment: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException || error instanceof ConflictException) {
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

      const payments = await this.paymentsService.findByPaymentLinkCode(linkCode);

      this.logger.log(`Found ${payments.length} payments for link: ${linkCode}`);
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
