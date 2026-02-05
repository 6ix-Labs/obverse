// src/wallet/services/wallet.service.ts

import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import type { IWalletRepository } from '../interfaces/wallet-repository.interface';
import { WALLET_REPOSITORY } from '../interfaces/wallet-repository.interface';
import type { ITurnkeyProvider } from '../interfaces/turnkey-provider.interface';
import { TURNKEY_PROVIDER } from '../interfaces/turnkey-provider.interface';
import type { UserWallet } from '../entities/wallet.entity';
import type { ConfigType } from '@nestjs/config';
import {
  CreateUserWalletDto,
  SignSolanaTransactionDto,
  SignAndSendSolanaTransactionDto,
  WalletResponseDto,
  SignedTransactionResponseDto,
  TransactionSentResponseDto,
} from '../dto/wallet.dto';
import turnkeyConfig from '../config/turnkey.config';
// import turnkeyConfig from '../config/turnkey.config';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    @Inject(TURNKEY_PROVIDER)
    private readonly turnkeyProvider: ITurnkeyProvider,
    @Inject(turnkeyConfig.KEY)
    private readonly config: ConfigType<typeof turnkeyConfig>,
  ) {}

  /**
   * Create a new wallet for a user (called when user does /start)
   * Returns existing wallet if one already exists for this user
   */
  async createWalletForUser(
    dto: CreateUserWalletDto,
  ): Promise<WalletResponseDto> {
    const { odaUserId, userName, userEmail } = dto;

    // Check if wallet already exists for this user
    const existingWallet =
      await this.walletRepository.findByOdaUserId(odaUserId);
    if (existingWallet) {
      this.logger.log(`Wallet already exists for user: ${odaUserId}`);
      return this.toWalletResponse(existingWallet);
    }

    this.logger.log(`Creating new wallet for user: ${odaUserId}`);

    // Create sub-organization with wallet in Turnkey
    const { subOrganizationId, walletId, solanaAddress, ethereumAddress } =
      await this.turnkeyProvider.createSubOrganizationWithWallet({
        userName: userName || `User-${odaUserId}`,
        userEmail,
        walletName: `Wallet-${odaUserId}`,
      });

    // Save the wallet mapping to our database
    const userWallet = await this.walletRepository.create({
      odaUserId,
      subOrganizationId,
      walletId,
      solanaAddress,
      ethereumAddress,
    });

    this.logger.log(
      `Wallet created successfully for user: ${odaUserId}, address: ${solanaAddress}`,
    );

    return this.toWalletResponse(userWallet);
  }

  /**
   * Get wallet for a user
   */
  async getWalletByUserId(odaUserId: string): Promise<WalletResponseDto> {
    const wallet = await this.walletRepository.findByOdaUserId(odaUserId);
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user: ${odaUserId}`);
    }
    return this.toWalletResponse(wallet);
  }

  /**
   * Get wallet by Solana address
   */
  async getWalletByAddress(solanaAddress: string): Promise<WalletResponseDto> {
    const wallet =
      await this.walletRepository.findBySolanaAddress(solanaAddress);
    if (!wallet) {
      throw new NotFoundException(
        `Wallet not found for address: ${solanaAddress}`,
      );
    }
    return this.toWalletResponse(wallet);
  }

  /**
   * Check if user has a wallet
   */
  async hasWallet(odaUserId: string): Promise<boolean> {
    return this.walletRepository.exists(odaUserId);
  }

  /**
   * Sign a Solana transaction for a user
   */
  async signSolanaTransaction(
    dto: SignSolanaTransactionDto,
  ): Promise<SignedTransactionResponseDto> {
    const { odaUserId, unsignedTransaction } = dto;

    const wallet = await this.walletRepository.findByOdaUserId(odaUserId);
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user: ${odaUserId}`);
    }

    this.logger.debug(`Signing transaction for user: ${odaUserId}`);

    const result = await this.turnkeyProvider.signSolanaTransaction(
      wallet.subOrganizationId,
      wallet.solanaAddress,
      unsignedTransaction,
    );

    return { signedTransaction: result.signedTransaction };
  }

  /**
   * Sign and send a Solana transaction for a user
   */
  async signAndSendSolanaTransaction(
    dto: SignAndSendSolanaTransactionDto,
  ): Promise<TransactionSentResponseDto> {
    const { odaUserId, unsignedTransaction, rpcUrl } = dto;

    const wallet = await this.walletRepository.findByOdaUserId(odaUserId);
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user: ${odaUserId}`);
    }

    this.logger.debug(`Signing and sending transaction for user: ${odaUserId}`);

    const signature = await this.turnkeyProvider.signAndSendSolanaTransaction(
      wallet.subOrganizationId,
      wallet.solanaAddress,
      unsignedTransaction,
      rpcUrl || this.config.solanaRpcUrl,
    );

    return { signature };
  }

  /**
   * Get or create wallet for a user (idempotent operation for /start)
   */
  async getOrCreateWallet(
    dto: CreateUserWalletDto,
  ): Promise<WalletResponseDto> {
    const existingWallet = await this.walletRepository.findByOdaUserId(
      dto.odaUserId,
    );
    if (existingWallet) {
      return this.toWalletResponse(existingWallet);
    }
    return this.createWalletForUser(dto);
  }

  async getWalletDocument(odaUserId: string): Promise<UserWallet | null> {
    return this.walletRepository.findByOdaUserId(odaUserId);
  }

  private toWalletResponse(wallet: UserWallet): WalletResponseDto {
    return {
      odaUserId: wallet.odaUserId,
      solanaAddress: wallet.solanaAddress,
      ethereumAddress: wallet.ethereumAddress,
      walletId: wallet.walletId,
      subOrganizationId: wallet.subOrganizationId,
    };
  }
}
