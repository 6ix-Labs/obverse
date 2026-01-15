// src/wallet/interfaces/wallet-repository.interface.ts

import { UserWallet } from '../entities/wallet.entity';

export interface IWalletRepository {
    /**
     * Find a user wallet by the external user ID (e.g., Telegram user ID)
     */
    findByOdaUserId(odaUserId: string): Promise<UserWallet | null>;

    /**
     * Find a user wallet by Solana address
     */
    findBySolanaAddress(solanaAddress: string): Promise<UserWallet | null>;

    /**
     * Create a new user wallet record
     */
    create(wallet: Omit<UserWallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserWallet>;

    /**
     * Update an existing user wallet
     */
    update(id: string, wallet: Partial<UserWallet>): Promise<UserWallet>;

    /**
     * Delete a user wallet record
     */
    delete(id: string): Promise<void>;

    /**
     * Check if a wallet exists for a given user
     */
    exists(odaUserId: string): Promise<boolean>;
}

export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');