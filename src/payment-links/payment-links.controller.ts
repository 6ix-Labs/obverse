import {
  Controller,
  Get,
  Param,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import * as express from 'express';
import { PaymentLinksService } from './payment-links.service';
import { OGImageService } from './og-image.service';
import { OGTemplateService } from './og-template.service';
import { PaymentLinkResponseDto } from './dto/payment-link-response.dto';

@ApiTags('payment-links')
@Controller('payment-links')
export class PaymentLinksController {
  private readonly logger = new Logger(PaymentLinksController.name);

  constructor(
    private readonly paymentLinksService: PaymentLinksService,
    private readonly ogImageService: OGImageService,
    private readonly ogTemplateService: OGTemplateService,
  ) {}

  @Get(':linkCode/og-image')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400') // Cache for 24 hours
  @ApiOperation({
    summary: 'Get OG image for payment link',
    description:
      'Generate and retrieve Open Graph image for social media previews of payment link',
  })
  @ApiParam({
    name: 'linkCode',
    description: 'Payment link code',
    example: 'x7k9m2',
  })
  @ApiProduces('image/png')
  @ApiResponse({
    status: 200,
    description: 'OG image generated successfully',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
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
  @ApiResponse({
    status: 500,
    description: 'Error generating OG image',
  })
  async getOGImage(
    @Param('linkCode') linkCode: string,
    @Res() res: express.Response,
  ): Promise<void> {
    try {
      // Validate linkCode parameter
      if (!linkCode || linkCode.trim().length === 0) {
        throw new BadRequestException('Payment link code is required');
      }

      if (linkCode.length < 6 || linkCode.length > 20) {
        throw new BadRequestException('Invalid payment link code format');
      }

      this.logger.log(`Generating OG image for: ${linkCode}`);

      const paymentLink =
        await this.paymentLinksService.findByLinkIdWithMerchant(linkCode);

      // Generate the OG image
      const imageBuffer = await this.ogImageService.generateOGImage(paymentLink);

      this.logger.log(`OG image generated for: ${linkCode}`);

      // Send the image buffer
      res.send(imageBuffer);
    } catch (error) {
      this.logger.error(
        `Error generating OG image for ${linkCode}: ${error.message}`,
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
        'An error occurred while generating the OG image',
      );
    }
  }

  @Get(':linkCode')
  @ApiOperation({
    summary: 'Get payment link by code',
    description:
      'Retrieve payment link details by link code. Returns HTML with OG tags for bots/browsers, JSON for API clients',
  })
  @ApiParam({
    name: 'linkCode',
    description: 'Payment link code',
    example: 'x7k9m2',
  })
  @ApiProduces('application/json', 'text/html')
  @ApiResponse({
    status: 200,
    description: 'Payment link details retrieved successfully (JSON for API clients, HTML with OG tags for bots/browsers)',
    type: PaymentLinkResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment link code format',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment link not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Error fetching payment link',
  })
  async getPaymentLinkByCode(
    @Param('linkCode') linkCode: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ): Promise<void> {
    try {
      // Validate linkCode parameter
      if (!linkCode || linkCode.trim().length === 0) {
        throw new BadRequestException('Payment link code is required');
      }

      if (linkCode.length < 6 || linkCode.length > 20) {
        throw new BadRequestException('Invalid payment link code format');
      }

      this.logger.log(`Fetching payment link: ${linkCode}`);

      const paymentLink =
        await this.paymentLinksService.findByLinkIdWithMerchant(linkCode);

      this.logger.log(`Payment link found: ${linkCode}`);

      // Check if request is from a bot/crawler or accepts HTML
      const userAgent = req.headers['user-agent']?.toLowerCase() || '';
      const acceptHeader = req.headers['accept']?.toLowerCase() || '';

      const isBotOrBrowser =
        this.isSocialMediaBot(userAgent) ||
        acceptHeader.includes('text/html');

      // If it's a bot or browser requesting HTML, return HTML with OG tags
      if (isBotOrBrowser && !acceptHeader.includes('application/json')) {
        const baseUrl = this.getBaseUrl(req);
        const html = this.ogTemplateService.generateHTML(paymentLink, baseUrl);

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        return;
      }

      // Otherwise, return JSON for API clients
      res.json(paymentLink);
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

  private isSocialMediaBot(userAgent: string): boolean {
    const botPatterns = [
      'facebookexternalhit',
      'facebookcatalog',
      'twitterbot',
      'telegrambot',
      'whatsapp',
      'slackbot',
      'discordbot',
      'linkedinbot',
      'pinterestbot',
      'redditbot',
      'applebot',
      'googlebot',
      'bingbot',
    ];

    return botPatterns.some((pattern) => userAgent.includes(pattern));
  }

  private getBaseUrl(req: express.Request): string {
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}`;
  }
}
