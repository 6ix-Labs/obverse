// src/wallet/dto/wallet.dto.ts

import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserWalletDto {
  @ApiProperty({
    description: 'Telegram user ID',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  odaUserId: string; // Telegram user id

  @ApiPropertyOptional({
    description: 'Telegram username',
    example: 'johndoe',
  })
  @IsString()
  @IsOptional()
  userName?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsString()
  @IsOptional()
  userEmail?: string;
}

export class SignSolanaTransactionDto {
  @ApiProperty({
    description: 'Telegram user ID',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  odaUserId: string;

  @ApiProperty({
    description: 'Base64 encoded serialized transaction',
    example:
      'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDoQ...',
  })
  @IsString()
  @IsNotEmpty()
  unsignedTransaction: string; // Base64 encoded serialized transaction
}

export class SignAndSendSolanaTransactionDto {
  @ApiProperty({
    description: 'Telegram user ID',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  odaUserId: string;

  @ApiProperty({
    description: 'Base64 encoded serialized transaction',
    example:
      'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDoQ...',
  })
  @IsString()
  @IsNotEmpty()
  unsignedTransaction: string;

  @ApiPropertyOptional({
    description: 'Custom RPC URL (optional)',
    example: 'https://api.mainnet-beta.solana.com',
  })
  @IsString()
  @IsOptional()
  rpcUrl?: string;
}

export class GetWalletDto {
  @ApiProperty({
    description: 'Telegram user ID',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  odaUserId: string;
}

export class WalletResponseDto {
  @ApiProperty({
    description: 'Telegram user ID',
    example: '123456789',
  })
  odaUserId: string;

  @ApiProperty({
    description: 'Solana wallet address',
    example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  })
  solanaAddress: string;

  @ApiPropertyOptional({
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  })
  ethereumAddress?: string;

  @ApiProperty({
    description: 'Turnkey wallet ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  walletId: string;

  @ApiProperty({
    description: 'Turnkey sub-organization ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  subOrganizationId: string;
}

export class SignedTransactionResponseDto {
  @ApiProperty({
    description: 'Signed transaction (base64 encoded)',
    example:
      'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDoQ...',
  })
  signedTransaction: string;
}

export class TransactionSentResponseDto {
  @ApiProperty({
    description: 'Transaction signature/hash',
    example: '5j7s8h3k9m2nwq4r6t8v1x3z5a7c9e2g4i6k8m0p2r4t6v8x0z2',
  })
  signature: string;
}

export class GetBalanceDto {
  @ApiProperty({
    description: 'Telegram user ID',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  odaUserId: string;

  @ApiPropertyOptional({
    description: 'Blockchain chain (defaults to solana)',
    example: 'solana',
  })
  @IsString()
  @IsOptional()
  chain?: string; // Defaults to 'solana'
}

export class TokenBalance {
  @ApiProperty({
    description: 'Token symbol',
    example: 'USDC',
  })
  symbol: string;

  @ApiProperty({
    description: 'Token mint/contract address',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  })
  mint: string;

  @ApiProperty({
    description: 'Token balance in smallest unit',
    example: 50000000,
  })
  balance: number;

  @ApiProperty({
    description: 'Token decimals',
    example: 6,
  })
  decimals: number;

  @ApiProperty({
    description: 'Human-readable balance',
    example: '50.00',
  })
  uiAmount: string;
}

export class TransactionSummary {
  @ApiProperty({
    description: 'Total amount received',
    example: 2000000000,
  })
  totalReceived: number;

  @ApiProperty({
    description: 'Total amount sent',
    example: 1000000000,
  })
  totalSent: number;

  @ApiProperty({
    description: 'Net balance from transactions',
    example: 1000000000,
  })
  netBalance: number;

  @ApiProperty({
    description: 'Total number of transactions',
    example: 42,
  })
  transactionCount: number;

  @ApiProperty({
    description: 'Transactions grouped by type',
    example: {
      payment: { count: 30, volume: 1500000000 },
      swap: { count: 12, volume: 500000000 },
    },
  })
  byType: Record<string, { count: number; volume: number }>;
}

export class BalanceResponseDto {
  @ApiProperty({
    description: 'Telegram user ID',
    example: '123456789',
  })
  odaUserId: string;

  @ApiProperty({
    description: 'Wallet address',
    example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Blockchain chain',
    example: 'solana',
  })
  chain: string;

  @ApiProperty({
    description: 'Native balance in smallest unit (e.g., lamports for Solana)',
    example: 1000000000,
  })
  nativeBalance: number; // SOL balance in lamports

  @ApiProperty({
    description: 'Native balance in human-readable format',
    example: '1.00',
  })
  nativeBalanceUI: string; // SOL balance in human-readable format

  @ApiProperty({
    description: 'Token balances',
    type: [TokenBalance],
  })
  tokens: TokenBalance[];

  @ApiProperty({
    description: 'Transaction history summary',
    type: TransactionSummary,
  })
  transactionSummary: TransactionSummary;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastUpdated: Date;
}
