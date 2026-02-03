import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard) // Protect all routes - requires valid JWT
export class DashboardController {
  constructor(private dashboardService: DashboardService) { }

  /**
   * GET /dashboard/overview
   * Get payment link dashboard overview with stats and recent payments
   * Scoped to the payment link specified in the JWT token
   */
  @Get('overview')
  async getOverview(@Request() req) {
    const merchantId = req.user.merchantId;
    const paymentLinkId = req.user.paymentLinkId;
    return this.dashboardService.getPaymentLinkOverview(merchantId, paymentLinkId);
  }

  /**
   * GET /dashboard/payments
   * Get paginated payments for this payment link
   */
  @Get('payments')
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
