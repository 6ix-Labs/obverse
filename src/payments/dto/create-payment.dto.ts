import { IsString, IsNumber, IsNotEmpty, IsOptional, IsObject, Min, IsEnum, IsBoolean } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  linkCode: string; // Payment link code (e.g., 'x7k9m2')

  @IsString()
  @IsNotEmpty()
  txSignature: string; // Transaction signature/hash from blockchain

  @IsString()
  @IsNotEmpty()
  chain: string; // solana, ethereum, base, polygon, arbitrum, etc.

  @IsNumber()
  @Min(0)
  amount: number; // Amount paid

  @IsString()
  @IsNotEmpty()
  token: string; // USDC, SOL, USDT, ETH, etc.

  @IsString()
  @IsOptional()
  tokenMintAddress?: string; // Token contract/mint address

  @IsString()
  @IsNotEmpty()
  fromAddress: string; // Payer's wallet address

  @IsString()
  @IsNotEmpty()
  toAddress: string; // Recipient wallet address

  @IsObject()
  @IsOptional()
  customerData?: Record<string, string>; // Custom fields data from the form

  @IsNumber()
  @IsOptional()
  blockNumber?: number; // For EVM chains

  @IsNumber()
  @IsOptional()
  slot?: number; // For Solana

  @IsBoolean()
  @IsOptional()
  isConfirmed?: boolean; // Whether the transaction is already confirmed (default: true)

  @IsNumber()
  @IsOptional()
  confirmations?: number; // Number of confirmations (optional)
}