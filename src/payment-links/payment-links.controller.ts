import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Req,
  Res,
  Header,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProduces,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import * as express from 'express';
import { PaymentLinksService } from './payment-links.service';
import { OGImageService } from './og-image.service';
import { OGTemplateService } from './og-template.service';
import { PaymentLinkResponseDto } from './dto/payment-link-response.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import {
  GenerateDashboardDto,
  DashboardCredentialsResponseDto,
} from './dto/generate-dashboard.dto';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { DashboardAuthService } from '../auth/dashboard-auth.service';

@ApiTags('payment-links')
@Controller('payment-links')
export class PaymentLinksController {
  private readonly logger = new Logger(PaymentLinksController.name);

  constructor(
    private readonly paymentLinksService: PaymentLinksService,
    private readonly ogImageService: OGImageService,
    private readonly ogTemplateService: OGTemplateService,
    private readonly dashboardAuthService: DashboardAuthService,
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
      const imageBuffer =
        await this.ogImageService.generateOGImage(paymentLink);

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
    description:
      'Payment link details retrieved successfully (JSON for API clients, HTML with OG tags for bots/browsers)',
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

      const apiKeyHeader = req.headers['x-api-key'];
      const formatQuery = String(req.query?.format || '').toLowerCase();
      const isApiClientRequest =
        Boolean(apiKeyHeader) ||
        acceptHeader.includes('application/json') ||
        formatQuery === 'json';

      const isBotOrBrowser =
        this.isSocialMediaBot(userAgent) || acceptHeader.includes('text/html');

      // If it's a bot or browser requesting HTML, return HTML with OG tags
      if (isBotOrBrowser && !isApiClientRequest) {
        const baseUrl = this.getBaseUrl(req);
        const html = this.ogTemplateService.generateHTML(paymentLink, baseUrl);

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        return;
      }

      // Otherwise, return JSON for API clients
      res.json(this.normalizePaymentLinkResponse(paymentLink, req));
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

  /**
   * POST /payment-links
   * Create a new payment link with custom fields (API Key Protected - for agents)
   */
  @Post()
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity('X-API-Key')
  @ApiOperation({
    summary: 'Create payment link (Agent API - requires API key)',
    description:
      'Create a new payment link with optional custom fields for collecting customer data. Requires valid API key in X-API-Key header.',
  })
  @ApiBody({ type: CreatePaymentLinkDto })
  @ApiResponse({
    status: 201,
    description: 'Payment link created successfully',
    type: PaymentLinkResponseDto,
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439012',
        merchantId: '507f1f77bcf86cd799439011',
        linkId: 'x7k9m2',
        amount: 50,
        token: 'USDC',
        chain: 'base',
        description: 'Premium Product',
        customFields: [
          { fieldName: 'email', fieldType: 'email', required: true },
          { fieldName: 'name', fieldType: 'text', required: true },
        ],
        isReusable: true,
        isActive: true,
        paymentCount: 0,
        paymentUrl: 'https://pay.obverse.app/x7k9m2',
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  async createPaymentLink(
    @Body() createPaymentLinkDto: CreatePaymentLinkDto,
    @Req() req: any,
  ): Promise<any> {
    try {
      // Extract merchant from request (set by ApiKeyGuard)
      const merchant = req.merchant;

      this.logger.log(
        `Creating payment link for merchant ${merchant._id} via API key`,
      );

      // Parse expiration date if provided
      const expiresAt = createPaymentLinkDto.expiresAt
        ? new Date(createPaymentLinkDto.expiresAt)
        : undefined;

      // Map custom fields with defaults
      const customFields = (createPaymentLinkDto.customFields || []).map(
        (field) => ({
          fieldName: field.fieldName,
          fieldType: field.fieldType || 'text',
          required: field.required ?? true,
        }),
      );

      // Create payment link with custom fields
      const paymentLink = await this.paymentLinksService.createPaymentLink({
        merchantId: merchant._id.toString(),
        amount: createPaymentLinkDto.amount,
        token: createPaymentLinkDto.token || 'USDC',
        chain: createPaymentLinkDto.chain || 'solana',
        description: createPaymentLinkDto.description,
        customFields,
        isReusable: createPaymentLinkDto.isReusable ?? false,
        expiresAt,
        recipientWalletAddress: createPaymentLinkDto.recipientWalletAddress,
      });

      // Get base URL for constructing payment URL
      const baseUrl = process.env.PAYMENT_URL || 'https://pay.obverse.app';
      const paymentUrl = `${baseUrl}/${paymentLink.linkId}`;

      this.logger.log(
        `Payment link created successfully: ${paymentLink.linkId}`,
      );

      return {
        ...paymentLink.toObject(),
        paymentUrl,
        currency: paymentLink.token,
        walletAddress: paymentLink.recipientWalletAddress,
      };
    } catch (error) {
      this.logger.error(
        `Error creating payment link: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create payment link');
    }
  }

  /**
   * POST /payment-links/:linkId/dashboard
   * Generate dashboard access credentials for a payment link (API Key Protected - for agents)
   */
  @Post(':linkId/dashboard')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('X-API-Key')
  @ApiOperation({
    summary: 'Generate dashboard access (Agent API - requires API key)',
    description:
      'Generate temporary credentials to access dashboard for a specific payment link. Credentials expire in 2 hours. Requires valid API key in X-API-Key header.',
  })
  @ApiParam({
    name: 'linkId',
    description: 'Payment link ID or linkCode',
    example: 'x7k9m2',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard credentials generated successfully',
    type: DashboardCredentialsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment link not found or access denied',
  })
  async generateDashboardAccess(
    @Param('linkId') linkId: string,
    @Req() req: any,
  ): Promise<DashboardCredentialsResponseDto> {
    try {
      // Extract merchant from request (set by ApiKeyGuard)
      const merchant = req.merchant;

      this.logger.log(
        `Generating dashboard access for link ${linkId} (merchant: ${merchant._id})`,
      );

      // Find payment link (try both by linkId and by _id)
      let paymentLink: any;
      try {
        paymentLink = await this.paymentLinksService.findByLinkId(linkId);
      } catch {
        // If not found by linkCode, try by _id
        paymentLink = await this.paymentLinksService.findById(linkId);
      }

      // Verify ownership
      if (paymentLink.merchantId.toString() !== merchant._id.toString()) {
        throw new BadRequestException(
          'Payment link not found or access denied',
        );
      }

      // Generate temporary dashboard credentials
      const { identifier, temporaryPassword, expiresAt } =
        await this.dashboardAuthService.generateTemporaryPassword(
          merchant._id.toString(),
          paymentLink._id.toString(),
        );

      // Get dashboard URL
      const dashboardUrl =
        process.env.DASHBOARD_URL ||
        (process.env.APP_URL ? `${process.env.APP_URL}/dashboard` : null) ||
        'https://obverse.app/dashboard';

      this.logger.log(
        `Dashboard access generated for link ${paymentLink.linkId}`,
      );

      return {
        dashboardUrl,
        identifier,
        temporaryPassword,
        expiresAt,
        linkCode: paymentLink.linkId,
        description:
          paymentLink.description ||
          `${paymentLink.amount} ${paymentLink.token}`,
        message:
          '⚠️ Password expires in 2 hours. Do not share credentials. Dashboard shows analytics for this payment link only.',
      };
    } catch (error) {
      this.logger.error(
        `Error generating dashboard access: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error.name === 'NotFoundException'
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to generate dashboard access',
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

  private normalizePaymentLinkResponse(
    paymentLink: any,
    req: express.Request,
  ): Record<string, any> {
    const link = paymentLink?.toObject ? paymentLink.toObject() : paymentLink;
    const baseUrl = process.env.PAYMENT_URL || `${this.getBaseUrl(req)}/pay`;

    // Backward-compatible aliases expected by some clients (including OpenClaw skill)
    const walletAddress =
      link.recipientWalletAddress ||
      link.walletAddress ||
      link?.merchantId?.walletAddress;

    return {
      ...link,
      paymentUrl: `${baseUrl.replace(/\/$/, '')}/${link.linkId}`,
      currency: link.token,
      walletAddress,
    };
  }
}
