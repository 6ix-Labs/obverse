import { Controller, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { BalanceService } from './services/balance.service';
import { BalanceResponseDto } from './dto/wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly balanceService: BalanceService) {}

  /**
   * GET /wallet/:userId/balance
   * Get balance for a user's wallet
   *
   * @param userId - Telegram user ID (odaUserId)
   * @param chain - Optional chain parameter (defaults to 'solana')
   * @returns Balance information including on-chain balance and transaction summary
   */
  @Get(':userId/balance')
  async getBalance(
    @Param('userId') userId: string,
    @Query('chain') chain?: string,
  ): Promise<BalanceResponseDto> {
    if (!userId || userId.trim().length === 0) {
      throw new BadRequestException('User ID is required');
    }

    return this.balanceService.getBalance(userId, chain || 'solana');
  }
}
