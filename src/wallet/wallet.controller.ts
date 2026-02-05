import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BalanceService } from './services/balance.service';
import { BalanceResponseDto } from './dto/wallet.dto';

@ApiTags('wallet')
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
  @ApiOperation({
    summary: 'Get wallet balance',
    description:
      'Retrieve wallet balance information including native balance, token balances, and transaction summary for a user',
  })
  @ApiParam({
    name: 'userId',
    description: 'Telegram user ID (odaUserId)',
    example: '123456789',
  })
  @ApiQuery({
    name: 'chain',
    required: false,
    type: String,
    description: 'Blockchain chain (defaults to solana)',
    example: 'solana',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance information retrieved successfully',
    type: BalanceResponseDto,
    schema: {
      example: {
        odaUserId: '123456789',
        walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        chain: 'solana',
        nativeBalance: 1000000000,
        nativeBalanceUI: '1.00',
        tokens: [
          {
            symbol: 'USDC',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            balance: 50000000,
            decimals: 6,
            uiAmount: '50.00',
          },
        ],
        transactionSummary: {
          totalReceived: 2000000000,
          totalSent: 1000000000,
          netBalance: 1000000000,
          transactionCount: 42,
          byType: {
            payment: { count: 30, volume: 1500000000 },
            swap: { count: 12, volume: 500000000 },
          },
        },
        lastUpdated: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User ID is required',
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found for user',
  })
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
