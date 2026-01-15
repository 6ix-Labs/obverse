import {
  Controller,
  Get,
  Param,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinkDocument } from './schemas/payment-links.schema';

@Controller('payment-links')
export class PaymentLinksController {
  private readonly logger = new Logger(PaymentLinksController.name);

  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  @Get(':linkCode')
  async getPaymentLinkByCode(
    @Param('linkCode') linkCode: string,
  ): Promise<PaymentLinkDocument> {
    try {
      // Validate linkCode parameter
      if (!linkCode || linkCode.trim().length === 0) {
        throw new BadRequestException('Payment link code is required');
      }

      if (linkCode.length < 6 || linkCode.length > 20) {
        throw new BadRequestException(
          'Invalid payment link code format',
        );
      }

      this.logger.log(`Fetching payment link: ${linkCode}`);

      const paymentLink = await this.paymentLinksService.findByLinkIdWithMerchant(linkCode);

      this.logger.log(`Payment link found: ${linkCode}`);
      return paymentLink;
    } catch (error) {
      this.logger.error(
        `Error fetching payment link ${linkCode}: ${error.message}`,
        error.stack,
      );

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error.name === 'NotFoundException'
      ) {
        throw error;
      }

      // Handle unexpected errors
      throw new InternalServerErrorException(
        'An error occurred while fetching the payment link',
      );
    }
  }
}
