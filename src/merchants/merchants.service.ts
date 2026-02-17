// src/merchant/services/merchant.service.ts

import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Merchant, MerchantDocument } from './schema/merchant.schema';
import { WalletService } from 'src/wallet/services/wallet.service';
import { WALLET_REPOSITORY } from 'src/wallet/interfaces/wallet-repository.interface';
// import { Merchant, MerchantDocument } from '../schemas/merchant.schema';
// import { WalletService } from '../../wallet/services/wallet.service';
import type { IWalletRepository } from 'src/wallet/interfaces/wallet-repository.interface';
// import { WALLET_REPOSITORY } from '../../wallet/interfaces/wallet-repository.interface';

@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);

  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
    private readonly walletService: WalletService,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  /**
   * Create merchant with Turnkey wallet on /start
   */
  async createMerchant(
    telegramId: string,
    username: string,
    firstName?: string,
    lastName?: string,
  ) {
    // Check if merchant exists
    const existing = await this.merchantModel.findOne({ telegramId }).exec();
    if (existing) {
      return this.getMerchantWithWallet(telegramId);
    }

    // Create Turnkey wallet
    const walletResponse = await this.walletService.getOrCreateWallet({
      odaUserId: telegramId,
      userName: username,
    });

    // Get wallet document ID for linking
    const walletDoc = await this.walletService.getWalletDocument(telegramId);

    // Create merchant linked to wallet
    const wallets = [
      {
        address: walletResponse.solanaAddress,
        chain: 'solana',
        isActive: true,
        label: 'Turnkey Wallet',
      },
    ];

    if (walletResponse.ethereumAddress) {
      wallets.push({
        address: walletResponse.ethereumAddress,
        chain: 'monad',
        isActive: true,
        label: 'Turnkey Wallet',
      });
    }

    const merchant = new this.merchantModel({
      telegramId,
      username,
      firstName,
      lastName,
      turnkeyWalletId: walletDoc?.id,
      walletAddress: walletResponse.solanaAddress, // Set deprecated field for backward compatibility
      wallets,
    });

    await merchant.save();

    this.logger.log(
      `Created merchant ${telegramId} with wallet ${walletResponse.solanaAddress}`,
    );

    return {
      merchant,
      wallet: walletResponse,
    };
  }

  /**
   * Create merchant for an agent (platform-agnostic, no Telegram required).
   * If walletAddress is provided, uses it directly.
   * If not, auto-creates a Turnkey wallet.
   */
  async createAgentMerchant(data: {
    username: string;
    walletAddress?: string;
    chain?: string;
  }): Promise<{ merchant: MerchantDocument; wallet?: any }> {
    const chain = data.chain || 'solana';

    if (data.walletAddress) {
      // Agent brings their own wallet
      const wallets = [
        {
          address: data.walletAddress,
          chain,
          isActive: true,
          label: 'External Wallet',
        },
      ];

      const merchant = new this.merchantModel({
        username: data.username,
        walletAddress: data.walletAddress,
        wallets,
        defaultChain: chain,
      });

      await merchant.save();

      this.logger.log(
        `Created agent merchant ${merchant._id} (${data.username}) with external wallet ${data.walletAddress}`,
      );

      return { merchant };
    }

    // No wallet provided — auto-create via Turnkey
    // Use a unique agent ID as the Turnkey userId
    const agentUserId = `agent_${new Types.ObjectId().toHexString()}`;

    const walletResponse = await this.walletService.getOrCreateWallet({
      odaUserId: agentUserId,
      userName: data.username,
    });

    const walletDoc = await this.walletService.getWalletDocument(agentUserId);

    const wallets = [
      {
        address: walletResponse.solanaAddress,
        chain: 'solana',
        isActive: true,
        label: 'Turnkey Wallet',
      },
    ];

    if (walletResponse.ethereumAddress) {
      wallets.push({
        address: walletResponse.ethereumAddress,
        chain: 'monad',
        isActive: true,
        label: 'Turnkey Wallet',
      });
    }

    const merchant = new this.merchantModel({
      username: data.username,
      turnkeyWalletId: walletDoc?.id,
      walletAddress: walletResponse.solanaAddress,
      wallets,
    });

    await merchant.save();

    this.logger.log(
      `Created agent merchant ${merchant._id} (${data.username}) with Turnkey wallet ${walletResponse.solanaAddress}`,
    );

    return { merchant, wallet: walletResponse };
  }

  /**
   * Find merchant by telegramId
   */
  async findByTelegramId(telegramId: string): Promise<MerchantDocument | null> {
    const merchant = await this.merchantModel.findOne({ telegramId }).exec();
    if (!merchant) {
      return null;
    }

    await this.syncMerchantWalletsWithTurnkeyWallet(merchant, telegramId);
    return merchant;
  }

  async findById(
    id: string | Types.ObjectId,
  ): Promise<MerchantDocument | null> {
    return this.merchantModel.findById(id).exec();
  }

  /**
   * Find merchant by wallet address
   */
  async findByWalletAddress(
    walletAddress: string,
  ): Promise<MerchantDocument | null> {
    return this.merchantModel.findOne({ walletAddress }).exec();
  }

  /**
   * Find merchant by farcaster FID
   */
  async findByFarcasterFid(
    farcasterFid: string,
  ): Promise<MerchantDocument | null> {
    return this.merchantModel.findOne({ farcasterFid }).exec();
  }

  /**
   * Get or create merchant (idempotent for /start)
   */
  async getOrCreateMerchant(
    telegramId: string,
    username: string,
    firstName?: string,
    lastName?: string,
  ) {
    const existing = await this.merchantModel.findOne({ telegramId }).exec();
    if (existing) {
      const wallet = await this.walletService.getWalletDocument(telegramId);
      return {
        merchant: existing,
        wallet: wallet
          ? await this.walletService.getWalletByUserId(telegramId)
          : null,
        isNew: false,
      };
    }

    const result = await this.createMerchant(
      telegramId,
      username,
      firstName,
      lastName,
    );
    return {
      ...result,
      isNew: true,
    };
  }

  /**
   * Get merchant by telegramId
   */
  async getMerchantByTelegramId(
    telegramId: string,
  ): Promise<MerchantDocument | null> {
    return this.findByTelegramId(telegramId);
  }

  /**
   * Get merchant with wallet populated
   */
  async getMerchantWithWallet(telegramId: string) {
    const merchant = await this.merchantModel
      .findOne({ telegramId })
      .populate('turnkeyWalletId')
      .exec();

    if (!merchant) {
      return null;
    }

    // Also get wallet response for convenience
    let wallet;
    try {
      wallet = await this.walletService.getWalletByUserId(telegramId);
    } catch (e) {
      // Wallet might not exist
    }

    return {
      merchant,
      wallet,
    };
  }

  /**
   * Get merchant's Solana address
   */
  async getMerchantSolanaAddress(telegramId: string): Promise<string> {
    const wallet = await this.walletService.getWalletByUserId(telegramId);
    return wallet.solanaAddress;
  }

  /**
   * Sign transaction for merchant
   */
  async signTransaction(telegramId: string, unsignedTransaction: string) {
    const merchant = await this.getMerchantByTelegramId(telegramId);
    if (!merchant) {
      throw new NotFoundException(`Merchant not found: ${telegramId}`);
    }

    return this.walletService.signSolanaTransaction({
      odaUserId: telegramId,
      unsignedTransaction,
    });
  }

  /**
   * Sign and send transaction for merchant
   */
  async sendTransaction(
    telegramId: string,
    unsignedTransaction: string,
    rpcUrl?: string,
  ) {
    const merchant = await this.getMerchantByTelegramId(telegramId);
    if (!merchant) {
      throw new NotFoundException(`Merchant not found: ${telegramId}`);
    }

    return this.walletService.signAndSendSolanaTransaction({
      odaUserId: telegramId,
      unsignedTransaction,
      rpcUrl,
    });
  }

  /**
   * Add an external wallet to merchant (non-Turnkey)
   */
  async addExternalWallet(
    telegramId: string,
    address: string,
    chain: string,
    label?: string,
  ) {
    const merchant = await this.merchantModel
      .findOneAndUpdate(
        { telegramId },
        {
          $push: {
            wallets: {
              address,
              chain,
              isActive: true,
              label,
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!merchant) {
      throw new NotFoundException(`Merchant not found: ${telegramId}`);
    }

    return merchant;
  }

  /**
   * Remove an external wallet from merchant
   */
  async removeExternalWallet(telegramId: string, address: string) {
    const merchant = await this.merchantModel
      .findOneAndUpdate(
        { telegramId },
        {
          $pull: {
            wallets: { address },
          },
        },
        { new: true },
      )
      .exec();

    if (!merchant) {
      throw new NotFoundException(`Merchant not found: ${telegramId}`);
    }

    return merchant;
  }

  /**
   * Update merchant's wallet address (for external wallets)
   */
  async updateWallet(
    merchantIdentifier: string,
    walletAddress: string,
    chain: string = 'solana',
    label?: string,
  ): Promise<MerchantDocument> {
    const merchant = await this.findMerchantByIdentifier(merchantIdentifier);

    if (!merchant) {
      throw new NotFoundException(`Merchant not found: ${merchantIdentifier}`);
    }

    // Update the main wallet address (backward compatibility)
    merchant.walletAddress = walletAddress;

    // Check if wallet already exists in wallets array
    const existingWalletIndex = merchant.wallets.findIndex(
      (w) => w.chain === chain && w.address === walletAddress,
    );

    if (existingWalletIndex === -1) {
      // Add new wallet to array
      merchant.wallets.push({
        address: walletAddress,
        chain,
        isActive: true,
        label: label || `${chain} Wallet`,
      });
    }

    // Update default chain if different
    if (merchant.defaultChain !== chain) {
      merchant.defaultChain = chain;
    }

    await merchant.save();

    this.logger.log(
      `Updated wallet for merchant ${merchant.telegramId || merchant._id?.toString()}: ${walletAddress}`,
    );

    return merchant;
  }

  /**
   * Deactivate merchant
   */
  async deactivateMerchant(telegramId: string) {
    return this.merchantModel
      .findOneAndUpdate(
        { telegramId },
        { $set: { isActive: false } },
        { new: true },
      )
      .exec();
  }

  /**
   * Activate merchant
   */
  async activateMerchant(telegramId: string) {
    return this.merchantModel
      .findOneAndUpdate(
        { telegramId },
        { $set: { isActive: true } },
        { new: true },
      )
      .exec();
  }

  async updateSettings(
    telegramId: string,
    settings: {
      defaultToken?: string;
      defaultChain?: string;
      notificationsEnabled?: boolean;
      webhookUrl?: string;
      defaultCustomFields?: string[];
    },
  ): Promise<MerchantDocument> {
    const merchant = await this.merchantModel
      .findOneAndUpdate({ telegramId }, { $set: settings }, { new: true })
      .exec();

    if (!merchant) {
      throw new NotFoundException(`Merchant not found: ${telegramId}`);
    }

    this.logger.log(`Updated settings for merchant ${telegramId}`);

    return merchant;
  }

  /**
   * Upgrade existing wallet to support EVM chains (Monad, Ethereum)
   * For users who created wallets before EVM support was added
   */
  async upgradeWalletForEvm(telegramId: string): Promise<{
    merchant: MerchantDocument;
    wallet: any;
    wasUpgraded: boolean;
  }> {
    const merchant = await this.merchantModel.findOne({ telegramId }).exec();
    if (!merchant) {
      throw new NotFoundException(`Merchant not found: ${telegramId}`);
    }

    // Check if already has EVM support
    const existingWallet =
      await this.walletService.getWalletDocument(telegramId);
    if (existingWallet?.ethereumAddress) {
      this.logger.log(`Merchant ${telegramId} already has EVM support`);
      const walletResponse =
        await this.walletService.getWalletByUserId(telegramId);
      await this.syncMerchantWalletsWithWalletResponse(
        merchant,
        walletResponse,
      );
      return {
        merchant,
        wallet: walletResponse,
        wasUpgraded: false,
      };
    }

    try {
      // Best-effort backfill of EVM address for old wallets
      const upgradedWallet =
        await this.walletService.backfillEvmAddress(telegramId);

      // Ensure EVM address exists
      if (!upgradedWallet || !upgradedWallet.ethereumAddress) {
        this.logger.warn(
          `No EVM address available for merchant ${telegramId}; wallet remains Solana-only`,
        );
        return {
          merchant,
          wallet: upgradedWallet,
          wasUpgraded: false,
        };
      }

      await this.syncMerchantWalletsWithWalletResponse(
        merchant,
        upgradedWallet,
      );

      this.logger.log(
        `Upgraded wallet for merchant ${telegramId} with EVM support: ${upgradedWallet.ethereumAddress}`,
      );

      return {
        merchant,
        wallet: upgradedWallet,
        wasUpgraded: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upgrade wallet for merchant ${telegramId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to upgrade wallet for EVM support');
    }
  }

  /**
   * Check if merchant needs wallet upgrade for EVM support
   */
  async needsWalletUpgrade(telegramId: string): Promise<boolean> {
    try {
      const wallet = await this.walletService.getWalletDocument(telegramId);
      return !wallet?.ethereumAddress;
    } catch (error) {
      // If wallet doesn't exist, they need full setup, not just upgrade
      return false;
    }
  }

  /**
   * Check if merchant exists
   */
  async exists(telegramId: string): Promise<boolean> {
    const count = await this.merchantModel
      .countDocuments({ telegramId })
      .exec();
    return count > 0;
  }

  /**
   * Get all active merchants (for admin purposes)
   */
  async getAllActiveMerchants(limit = 100, skip = 0) {
    return this.merchantModel
      .find({ isActive: true })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  private async findMerchantByIdentifier(
    merchantIdentifier: string,
  ): Promise<MerchantDocument | null> {
    const byTelegramId = await this.merchantModel
      .findOne({ telegramId: merchantIdentifier })
      .exec();
    if (byTelegramId) {
      return byTelegramId;
    }

    if (Types.ObjectId.isValid(merchantIdentifier)) {
      return this.merchantModel.findById(merchantIdentifier).exec();
    }

    return null;
  }

  private async syncMerchantWalletsWithTurnkeyWallet(
    merchant: MerchantDocument,
    telegramId: string,
  ): Promise<void> {
    try {
      const wallet = await this.walletService.getWalletByUserId(telegramId);
      await this.syncMerchantWalletsWithWalletResponse(merchant, wallet);
    } catch (error) {
      // Keep merchant lookup resilient even if wallet sync fails.
      this.logger.warn(
        `Failed wallet sync for merchant ${telegramId}: ${error.message}`,
      );
    }
  }

  private async syncMerchantWalletsWithWalletResponse(
    merchant: MerchantDocument,
    wallet: {
      solanaAddress: string;
      ethereumAddress?: string;
    } | null,
  ): Promise<void> {
    if (!wallet) {
      return;
    }

    let changed = false;
    merchant.wallets = merchant.wallets || [];

    const ensureWallet = (chain: string, address: string) => {
      const existingByChain = merchant.wallets.find(
        (entry) => entry.chain === chain,
      );

      if (!existingByChain) {
        merchant.wallets.push({
          chain,
          address,
          isActive: true,
          label: 'Turnkey Wallet',
        });
        changed = true;
        return;
      }

      if (existingByChain.address !== address) {
        existingByChain.address = address;
        existingByChain.isActive = true;
        if (!existingByChain.label) {
          existingByChain.label = 'Turnkey Wallet';
        }
        changed = true;
      }
    };

    ensureWallet('solana', wallet.solanaAddress);
    merchant.walletAddress = wallet.solanaAddress;

    if (wallet.ethereumAddress) {
      ensureWallet('monad', wallet.ethereumAddress);
    }

    if (changed) {
      await merchant.save();
    }
  }
}
