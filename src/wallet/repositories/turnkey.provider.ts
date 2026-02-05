// src/wallet/repositories/turnkey.provider.ts

import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Turnkey } from '@turnkey/sdk-server';
import type {
  ITurnkeyProvider,
  CreateSubOrgWithWalletParams,
} from '../interfaces/turnkey-provider.interface';
import type {
  CreateWalletResult,
  SignTransactionResult,
} from '../entities/wallet.entity';
import turnkeyConfig from '../config/turnkey.config';

// Solana account parameters for wallet creation
const SOLANA_WALLET_ACCOUNT = {
  curve: 'CURVE_ED25519' as const,
  pathFormat: 'PATH_FORMAT_BIP32' as const,
  path: "m/44'/501'/0'/0'",
  addressFormat: 'ADDRESS_FORMAT_SOLANA' as const,
};

// Optional: Add Ethereum account if you want multi-chain support
const ETHEREUM_WALLET_ACCOUNT = {
  curve: 'CURVE_SECP256K1' as const,
  pathFormat: 'PATH_FORMAT_BIP32' as const,
  path: "m/44'/60'/0'/0/0",
  addressFormat: 'ADDRESS_FORMAT_ETHEREUM' as const,
};

@Injectable()
export class TurnkeyProvider implements ITurnkeyProvider, OnModuleInit {
  private readonly logger = new Logger(TurnkeyProvider.name);
  private turnkeyClient: Turnkey;

  constructor(
    @Inject(turnkeyConfig.KEY)
    private readonly config: ConfigType<typeof turnkeyConfig>,
  ) {}

  onModuleInit() {
    this.turnkeyClient = new Turnkey({
      apiBaseUrl: this.config.apiBaseUrl,
      apiPublicKey: this.config.apiPublicKey,
      apiPrivateKey: this.config.apiPrivateKey,
      defaultOrganizationId: this.config.defaultOrganizationId,
    });

    this.logger.log('Turnkey client initialized');
  }

  /**
   * Creates a sub-organization with a Solana wallet for a new user
   * Each user gets their own sub-organization for isolation
   */
  async createSubOrganizationWithWallet(
    params: CreateSubOrgWithWalletParams,
  ): Promise<CreateWalletResult> {
    const {
      userName = 'Obverse User',
      userEmail,
      walletName = 'Obverse Wallet',
    } = params;

    try {
      this.logger.debug(`Creating sub-organization for user: ${userName}`);

      const response = await this.turnkeyClient
        .apiClient()
        .createSubOrganization({
          organizationId: this.config.defaultOrganizationId,
          subOrganizationName: `${userName} - ${Date.now()}`,
          rootUsers: [
            {
              userName,
              userEmail: userEmail || `${Date.now()}@obverse.app`,
              apiKeys: [],
              authenticators: [],
              oauthProviders: [],
            },
          ],
          rootQuorumThreshold: 1,
          wallet: {
            walletName,
            accounts: [
              SOLANA_WALLET_ACCOUNT,
              // Uncomment if you want Ethereum support too
              // ETHEREUM_WALLET_ACCOUNT,
            ],
          },
        });

      const subOrganizationId = response.subOrganizationId;
      const walletId = response.wallet?.walletId;
      const addresses = response.wallet?.addresses || [];

      // Find the Solana address from the response
      const solanaAddress = addresses[0]; // First address is Solana based on our account order
      // const ethereumAddress = addresses[1]; // Uncomment if using Ethereum

      if (!subOrganizationId || !walletId || !solanaAddress) {
        throw new Error(
          'Failed to extract wallet details from Turnkey response',
        );
      }

      this.logger.log(
        `Created sub-org: ${subOrganizationId}, wallet: ${walletId}, address: ${solanaAddress}`,
      );

      return {
        subOrganizationId,
        walletId,
        solanaAddress,
        // ethereumAddress,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create sub-organization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Signs a Solana transaction using the Turnkey API
   */
  async signSolanaTransaction(
    organizationId: string,
    walletAddress: string,
    unsignedTransaction: string,
  ): Promise<SignTransactionResult> {
    try {
      this.logger.debug(`Signing transaction for address: ${walletAddress}`);

      const response = await this.turnkeyClient.apiClient().signTransaction({
        organizationId,
        signWith: walletAddress,
        unsignedTransaction,
        type: 'TRANSACTION_TYPE_SOLANA',
      });

      const signedTransaction = response.signedTransaction;

      if (!signedTransaction) {
        throw new Error('Failed to get signed transaction from Turnkey');
      }

      this.logger.log(`Transaction signed successfully for ${walletAddress}`);

      return { signedTransaction };
    } catch (error) {
      this.logger.error(
        `Failed to sign transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Signs and broadcasts a Solana transaction
   */
  async signAndSendSolanaTransaction(
    organizationId: string,
    walletAddress: string,
    unsignedTransaction: string,
    rpcUrl?: string,
  ): Promise<string> {
    try {
      this.logger.debug(
        `Signing and sending transaction for address: ${walletAddress}`,
      );

      // First sign the transaction
      const { signedTransaction } = await this.signSolanaTransaction(
        organizationId,
        walletAddress,
        unsignedTransaction,
      );

      // Then broadcast it using @solana/web3.js
      const { Connection } = await import('@solana/web3.js');
      const connection = new Connection(rpcUrl || this.config.solanaRpcUrl);

      const txBuffer = Buffer.from(signedTransaction, 'base64');
      const signature = await connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      this.logger.log(`Transaction sent: ${signature}`);

      return signature;
    } catch (error) {
      this.logger.error(
        `Failed to sign and send transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets wallet accounts for a sub-organization
   */
  async getWalletAccounts(
    organizationId: string,
    walletId: string,
  ): Promise<{ address: string; addressFormat: string }[]> {
    try {
      const response = await this.turnkeyClient.apiClient().getWalletAccounts({
        organizationId,
        walletId,
      });

      return (response.accounts || []).map((account) => ({
        address: account.address,
        addressFormat: account.addressFormat,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get wallet accounts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lists all wallets for a sub-organization
   */
  async listWallets(
    organizationId: string,
  ): Promise<{ walletId: string; walletName: string }[]> {
    try {
      const response = await this.turnkeyClient.apiClient().getWallets({
        organizationId,
      });

      return (response.wallets || []).map((wallet) => ({
        walletId: wallet.walletId,
        walletName: wallet.walletName,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to list wallets: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
