// src/wallet/interfaces/turnkey-provider.interface.ts

import { CreateWalletResult, SignTransactionResult } from '../entities/wallet.entity';

export interface CreateSubOrgWithWalletParams {
    userName?: string;
    userEmail?: string;
    walletName?: string;
}

export interface ITurnkeyProvider {
    /**
     * Create a sub-organization with a Solana wallet
     */
    createSubOrganizationWithWallet(
        params: CreateSubOrgWithWalletParams,
    ): Promise<CreateWalletResult>;

    /**
     * Sign a Solana transaction
     */
    signSolanaTransaction(
        organizationId: string,
        walletAddress: string,
        unsignedTransaction: string,
    ): Promise<SignTransactionResult>;

    /**
     * Sign and send a Solana transaction
     */
    signAndSendSolanaTransaction(
        organizationId: string,
        walletAddress: string,
        unsignedTransaction: string,
        rpcUrl: string,
    ): Promise<string>;

    /**
     * Get wallet accounts for a sub-organization
     */
    getWalletAccounts(
        organizationId: string,
        walletId: string,
    ): Promise<{ address: string; addressFormat: string }[]>;

    /**
     * List all wallets for a sub-organization
     */
    listWallets(organizationId: string): Promise<{ walletId: string; walletName: string }[]>;
}

export const TURNKEY_PROVIDER = Symbol('TURNKEY_PROVIDER');