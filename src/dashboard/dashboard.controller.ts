import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
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
   * Get paginated payments for this payment link
   */
  @Get('payments')
  @ApiOperation({
    summary: 'Get paginated payments',
    description:
      'Retrieve paginated list of payments for the payment link specified in JWT token',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of payments to return',
    example: 50,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of payments to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved payments',
    schema: {
      example: {
        payments: [],
        total: 42,
        limit: 50,
        skip: 0,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getPayments(
    @Request() req,
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
  ) {
    const merchantId = req.user.merchantId;
    const paymentLinkId = req.user.paymentLinkId;
    return this.dashboardService.getPayments(
      merchantId,
      paymentLinkId,
      parseInt(limit, 10),
      parseInt(skip, 10),
    );
  }
}
