// src/wallet/services/balance.service.ts

import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { ConfigType } from '@nestjs/config';
import { WALLET_REPOSITORY } from '../interfaces/wallet-repository.interface';
import type { IWalletRepository } from '../interfaces/wallet-repository.interface';
import {
  Transaction,
  TransactionDocument,
} from '../../transactions/schemas/transaction.schema';
import {
  BalanceResponseDto,
  TokenBalance,
  TransactionSummary,
} from '../dto/wallet.dto';
import turnkeyConfig from '../config/turnkey.config';
import { EvmService } from '../../blockchain/services/evm.service';
import { isChainSupported } from '../../blockchain/config/chains.config';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);
  private solanaConnection: Connection;

  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @Inject(turnkeyConfig.KEY)
    private readonly config: ConfigType<typeof turnkeyConfig>,
    private readonly evmService: EvmService,
  ) {
    // Initialize Solana connection
    this.solanaConnection = new Connection(
      this.config.solanaRpcUrl || 'https://api.mainnet-beta.solana.com',
      'confirmed',
    );
  }

  /**
   * Get comprehensive balance for a user
   * Includes on-chain balance and transaction history summary
   */
  async getBalance(
    odaUserId: string,
    chain = 'solana',
  ): Promise<BalanceResponseDto> {
    try {
      // Validate input
      if (!odaUserId || odaUserId.trim().length === 0) {
        throw new BadRequestException('User ID is required');
      }

      // Validate chain is supported
      if (!isChainSupported(chain)) {
        throw new BadRequestException(
          `Unsupported chain: ${chain}. Supported chains: solana, monad`,
        );
      }

      // Get wallet from database
      const wallet = await this.walletRepository.findByOdaUserId(odaUserId);
      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user: ${odaUserId}`);
      }

      this.logger.log(
        `Fetching balance for user ${odaUserId}, chain: ${chain}`,
      );

      // Get wallet address based on chain
      let walletAddress: string;
      if (chain === 'solana') {
        walletAddress = wallet.solanaAddress;
      } else {
        // For EVM chains (monad, ethereum, base, etc.) - all use the same Ethereum address
        if (!wallet.ethereumAddress) {
          throw new BadRequestException(
            `No EVM address found for user ${odaUserId}. Run /start once to sync or upgrade your wallet for EVM chains.`,
          );
        }
        walletAddress = wallet.ethereumAddress;
      }

      // Fetch on-chain balance and transaction summary in parallel
      const [onChainData, transactionSummary] = await Promise.all([
        this.getOnChainBalance(walletAddress, chain),
        this.getTransactionSummary(odaUserId, chain),
      ]);

      return {
        odaUserId,
        walletAddress,
        chain,
        nativeBalance: onChainData.nativeBalance,
        nativeBalanceUI: onChainData.nativeBalanceUI,
        tokens: onChainData.tokens,
        transactionSummary,
        lastUpdated: new Date(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error fetching balance for user ${odaUserId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to fetch balance');
    }
  }

  /**
   * Get on-chain balance from blockchain (supports Solana and EVM chains)
   */
  private async getOnChainBalance(
    walletAddress: string,
    chain: string,
  ): Promise<{
    nativeBalance: number;
    nativeBalanceUI: string;
    tokens: TokenBalance[];
  }> {
    try {
      if (chain === 'solana') {
        return this.getSolanaBalance(walletAddress);
      } else {
        // EVM chains (monad, etc.)
        return this.getEvmBalance(walletAddress, chain);
      }
    } catch (error) {
      this.logger.error(
        `Error fetching on-chain balance for ${walletAddress} on ${chain}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to fetch on-chain balance');
    }
  }

  /**
   * Get Solana on-chain balance
   */
  private async getSolanaBalance(walletAddress: string): Promise<{
    nativeBalance: number;
    nativeBalanceUI: string;
    tokens: TokenBalance[];
  }> {
    const publicKey = new PublicKey(walletAddress);

    // Get SOL balance
    const balance = await this.solanaConnection.getBalance(publicKey);

    // Get token accounts (SPL tokens like USDC, USDT)
    const tokenAccounts =
      await this.solanaConnection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      }); // SPL Token Program

    const tokens: TokenBalance[] = tokenAccounts.value
      .filter((account) => {
        const tokenAmount = account.account.data.parsed.info.tokenAmount;
        return tokenAmount.uiAmount > 0; // Only include tokens with balance
      })
      .map((account) => {
        const parsedInfo = account.account.data.parsed.info;
        const tokenAmount = parsedInfo.tokenAmount;

        // Map common token mints to symbols
        const mint = parsedInfo.mint;
        const symbol = this.getTokenSymbol(mint);

        return {
          symbol,
          mint,
          balance: Number(tokenAmount.amount),
          decimals: tokenAmount.decimals,
          uiAmount: tokenAmount.uiAmountString,
        };
      });

    return {
      nativeBalance: balance,
      nativeBalanceUI: (balance / LAMPORTS_PER_SOL).toFixed(9),
      tokens,
    };
  }

  /**
   * Get EVM chain balance (Monad, Ethereum, etc.)
   */
  private async getEvmBalance(
    walletAddress: string,
    chain: string,
  ): Promise<{
    nativeBalance: number;
    nativeBalanceUI: string;
    tokens: TokenBalance[];
  }> {
    const evmBalance = await this.evmService.getBalance(chain, walletAddress);

    // Convert to format expected by BalanceResponseDto
    const tokens: TokenBalance[] = evmBalance.tokens.map((token) => ({
      symbol: token.symbol,
      mint: token.address || '',
      balance: Number(token.balance),
      decimals: token.decimals,
      uiAmount: token.balanceFormatted,
    }));

    return {
      nativeBalance: Number(evmBalance.nativeBalance),
      nativeBalanceUI: evmBalance.nativeBalanceFormatted,
      tokens,
    };
  }

  /**
   * Get transaction summary from database
   */
  private async getTransactionSummary(
    odaUserId: string,
    chain: string,
  ): Promise<TransactionSummary> {
    try {
      // Get wallet to find merchantId
      const wallet = await this.walletRepository.findByOdaUserId(odaUserId);
      if (!wallet) {
        return {
          totalReceived: 0,
          totalSent: 0,
          netBalance: 0,
          transactionCount: 0,
          byType: {},
        };
      }

      // Pick the wallet address based on selected chain.
      // Solana uses solanaAddress; EVM chains (Monad, etc.) use ethereumAddress.
      const walletAddress =
        chain.toLowerCase() === 'solana'
          ? wallet.solanaAddress
          : wallet.ethereumAddress;

      if (!walletAddress) {
        return {
          totalReceived: 0,
          totalSent: 0,
          netBalance: 0,
          transactionCount: 0,
          byType: {},
        };
      }

      const normalizedWalletAddress =
        chain.toLowerCase() === 'solana'
          ? walletAddress
          : walletAddress.toLowerCase();

      // Query transactions by chain-specific wallet address instead of merchantId
      // Since we need to track all incoming/outgoing from this specific wallet
      const transactions = await this.transactionModel.find({
        $or: [
          { fromAddress: walletAddress },
          { toAddress: walletAddress },
          // EVM addresses can have mixed casing depending on source.
          // Keep fallback matches for normalized lowercase values.
          { fromAddress: normalizedWalletAddress },
          { toAddress: normalizedWalletAddress },
        ],
        chain,
        status: 'confirmed', // Only count confirmed transactions
      });

      let totalReceived = 0;
      let totalSent = 0;
      const byType: Record<string, { count: number; volume: number }> = {};

      transactions.forEach((tx) => {
        // Initialize type counter if needed
        if (!byType[tx.type]) {
          byType[tx.type] = { count: 0, volume: 0 };
        }
        byType[tx.type].count++;
        byType[tx.type].volume += tx.amount;

        const txTo =
          chain.toLowerCase() === 'solana'
            ? tx.toAddress
            : tx.toAddress.toLowerCase();
        const txFrom =
          chain.toLowerCase() === 'solana'
            ? tx.fromAddress
            : tx.fromAddress.toLowerCase();

        // Calculate received vs sent
        if (txTo === normalizedWalletAddress) {
          totalReceived += tx.amount;
        }
        if (txFrom === normalizedWalletAddress) {
          totalSent += tx.amount;
        }
      });

      return {
        totalReceived,
        totalSent,
        netBalance: totalReceived - totalSent,
        transactionCount: transactions.length,
        byType,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching transaction summary for ${odaUserId}: ${error.message}`,
        error.stack,
      );
      // Return empty summary instead of throwing
      return {
        totalReceived: 0,
        totalSent: 0,
        netBalance: 0,
        transactionCount: 0,
        byType: {},
      };
    }
  }

  /**
   * Map token mint addresses to known symbols
   */
  private getTokenSymbol(mint: string): string {
    const knownTokens: Record<string, string> = {
      // USDC on Solana mainnet
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
      // USDT on Solana mainnet
      Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
      // Wrapped SOL
      So11111111111111111111111111111111111111112: 'SOL',
      // Add more tokens as needed
    };

    return knownTokens[mint] || 'UNKNOWN';
  }
}
