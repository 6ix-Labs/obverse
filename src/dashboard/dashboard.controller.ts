import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard) // Protect all routes - requires valid JWT
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  /**
   * GET /dashboard/overview
   * Get payment link dashboard overview with stats and recent payments
   * Scoped to the payment link specified in the JWT token
   */
  @Get('overview')
  @ApiOperation({
    summary: 'Get payment link overview',
    description:
      'Get comprehensive dashboard overview including stats, recent payments, and analytics for the payment link specified in JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved dashboard overview',
    schema: {
      example: {
        paymentLink: {
          _id: '507f1f77bcf86cd799439012',
          linkCode: 'x7k9m2',
          title: 'Product Purchase',
          description: 'Payment for premium product',
          amount: 50,
          currency: 'USDC',
        },
        stats: {
          totalPayments: 42,
          totalAmount: 2100,
          successRate: 95.2,
        },
        recentPayments: [],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getOverview(@Request() req) {
    const merchantId = req.user.merchantId;
    const paymentLinkId = req.user.paymentLinkId;
    return this.dashboardService.getPaymentLinkOverview(
      merchantId,
      paymentLinkId,
    );
  }

  /**
   * GET /dashboard/payments
   * Get paginated payments for this payment link with filters
   */
  @Get('payments')
  @ApiOperation({
    summary: 'Get paginated payments with filters',
    description:
      'Retrieve filtered and paginated list of payments for the payment link specified in JWT token',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of payments to return (max 1000)',
    example: 50,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of payments to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'token',
    required: false,
    type: String,
    description: 'Filter by token (USDC, SOL, USDT, ETH, etc.)',
    example: 'USDC',
  })
  @ApiQuery({
    name: 'chain',
    required: false,
    type: String,
    description: 'Filter by blockchain chain',
    example: 'solana',
    enum: ['solana', 'ethereum', 'base', 'polygon', 'arbitrum'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date filter (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date filter (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search across transaction signatures, wallet addresses, customer data, and amounts',
    example: 'ABC123',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved payments',
    schema: {
      example: {
        payments: [],
        pagination: {
          total: 42,
          limit: 50,
          skip: 0,
          hasMore: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid filter parameters',
  })
  async getPayments(
    @Request() req,
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @Query('token') token?: string,
    @Query('chain') chain?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const merchantId = req.user.merchantId;
    const paymentLinkId = req.user.paymentLinkId;

    // Validate pagination parameters
    const parsedLimit = parseInt(limit, 10);
    const parsedSkip = parseInt(skip, 10);

    if (isNaN(parsedLimit) || parsedLimit < 0 || parsedLimit > 1000) {
      throw new BadRequestException('Limit must be between 0 and 1000');
    }

    if (isNaN(parsedSkip) || parsedSkip < 0) {
      throw new BadRequestException('Skip must be greater than or equal to 0');
    }

    // Validate and parse dates
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new BadRequestException('Invalid start date format');
      }
    }

    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new BadRequestException('Invalid end date format');
      }
    }

    // Validate date range
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.dashboardService.getPayments(
      merchantId,
      paymentLinkId,
      parsedLimit,
      parsedSkip,
      {
        token,
        chain,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        search,
      },
    );
  }
}
