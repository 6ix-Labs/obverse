import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsObject,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment link code',
    example: 'x7k9m2',
  })
  @IsString()
  @IsNotEmpty()
  linkCode: string; // Payment link code (e.g., 'x7k9m2')

  @ApiProperty({
    description: 'Transaction signature/hash from blockchain',
    example: '5j7s8h3k9m2nwq4r6t8v1x3z5a7c9e2g4i6k8m0p2r4t6v8x0z2',
  })
  @IsString()
  @IsNotEmpty()
  txSignature: string; // Transaction signature/hash from blockchain

  @ApiProperty({
    description: 'Blockchain chain',
    example: 'solana',
    enum: ['solana', 'monad'],
  })
  @IsString()
  @IsNotEmpty()
  chain: string; // solana, monad

  @ApiProperty({
    description: 'Amount paid',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number; // Amount paid

  @ApiProperty({
    description: 'Token symbol',
    example: 'USDC',
  })
  @IsString()
  @IsNotEmpty()
  token: string; // USDC, SOL, USDT, ETH, etc.

  @ApiPropertyOptional({
    description: 'Token contract/mint address',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  })
  @IsString()
  @IsOptional()
  tokenMintAddress?: string; // Token contract/mint address

  @ApiProperty({
    description: 'Payer wallet address',
    example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  })
  @IsString()
  @IsNotEmpty()
  fromAddress: string; // Payer's wallet address

  @ApiProperty({
    description: 'Recipient wallet address',
    example: '9yZXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  })
  @IsString()
  @IsNotEmpty()
  toAddress: string; // Recipient wallet address

  @ApiPropertyOptional({
    description: 'Custom fields data from the payment form',
    example: { email: 'user@example.com', name: 'John Doe' },
  })
  @IsObject()
  @IsOptional()
  customerData?: Record<string, string>; // Custom fields data from the form

  @ApiPropertyOptional({
    description: 'Block number (for EVM chains)',
    example: 12345678,
  })
  @IsNumber()
  @IsOptional()
  blockNumber?: number; // For EVM chains

  @ApiPropertyOptional({
    description: 'Slot number (for Solana)',
    example: 98765432,
  })
  @IsNumber()
  @IsOptional()
  slot?: number; // For Solana

  @ApiPropertyOptional({
    description: 'Whether the transaction is already confirmed',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isConfirmed?: boolean; // Whether the transaction is already confirmed (default: true)

  @ApiPropertyOptional({
    description: 'Number of confirmations',
    example: 32,
  })
  @IsNumber()
  @IsOptional()
  confirmations?: number; // Number of confirmations (optional)
}
