// src/wallet/dto/wallet.dto.ts

import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateUserWalletDto {
    @IsString()
    @IsNotEmpty()
    odaUserId: string; // Telegram user id

    @IsString()
    @IsOptional()
    userName?: string;

    @IsString()
    @IsOptional()
    userEmail?: string;
}

export class SignSolanaTransactionDto {
    @IsString()
    @IsNotEmpty()
    odaUserId: string;

    @IsString()
    @IsNotEmpty()
    unsignedTransaction: string; // Base64 encoded serialized transaction
}

export class SignAndSendSolanaTransactionDto {
    @IsString()
    @IsNotEmpty()
    odaUserId: string;

    @IsString()
    @IsNotEmpty()
    unsignedTransaction: string;

    @IsString()
    @IsOptional()
    rpcUrl?: string;
}

export class GetWalletDto {
    @IsString()
    @IsNotEmpty()
    odaUserId: string;
}

export class WalletResponseDto {
    odaUserId: string;
    solanaAddress: string;
    ethereumAddress?: string;
    walletId: string;
    subOrganizationId: string;
}

export class SignedTransactionResponseDto {
    signedTransaction: string;
}

export class TransactionSentResponseDto {
    signature: string;
}

export class GetBalanceDto {
    @IsString()
    @IsNotEmpty()
    odaUserId: string;

    @IsString()
    @IsOptional()
    chain?: string; // Defaults to 'solana'
}

export class TokenBalance {
    symbol: string;
    mint: string;
    balance: number;
    decimals: number;
    uiAmount: string;
}

export class TransactionSummary {
    totalReceived: number;
    totalSent: number;
    netBalance: number;
    transactionCount: number;
    byType: Record<string, { count: number; volume: number }>;
}

export class BalanceResponseDto {
    odaUserId: string;
    walletAddress: string;
    chain: string;

    // On-chain balance
    nativeBalance: number; // SOL balance in lamports
    nativeBalanceUI: string; // SOL balance in human-readable format
    tokens: TokenBalance[];

    // Transaction history summary
    transactionSummary: TransactionSummary;

    // Timestamps
    lastUpdated: Date;
}