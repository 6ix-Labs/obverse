// src/wallet/repositories/wallet-mongo.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IWalletRepository } from '../interfaces/wallet-repository.interface';
import { UserWallet } from '../entities/wallet.entity';
import { UserWalletModel, UserWalletDocument } from '../schemas/user-wallet.schema';

@Injectable()
export class MongoWalletRepository implements IWalletRepository {
    private readonly logger = new Logger(MongoWalletRepository.name);

    constructor(
        @InjectModel(UserWalletModel.name)
        private readonly userWalletModel: Model<UserWalletDocument>,
    ) { }

    async findByOdaUserId(odaUserId: string): Promise<UserWallet | null> {
        const doc = await this.userWalletModel.findOne({ odaUserId }).exec();
        return doc ? this.toUserWallet(doc) : null;
    }

    async findBySolanaAddress(solanaAddress: string): Promise<UserWallet | null> {
        const doc = await this.userWalletModel.findOne({ solanaAddress }).exec();
        return doc ? this.toUserWallet(doc) : null;
    }

    async create(
        walletData: Omit<UserWallet, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<UserWallet> {
        const created = new this.userWalletModel(walletData);
        const saved = await created.save();
        this.logger.log(`Created wallet record for user: ${saved.odaUserId}`);
        return this.toUserWallet(saved);
    }

    async update(id: string, updates: Partial<UserWallet>): Promise<UserWallet> {
        const updated = await this.userWalletModel
            .findByIdAndUpdate(id, { $set: updates }, { new: true })
            .exec();

        if (!updated) {
            throw new Error(`Wallet with id ${id} not found`);
        }

        return this.toUserWallet(updated);
    }

    async delete(id: string): Promise<void> {
        await this.userWalletModel.findByIdAndDelete(id).exec();
    }

    async exists(odaUserId: string): Promise<boolean> {
        const count = await this.userWalletModel.countDocuments({ odaUserId }).exec();
        return count > 0;
    }

    private toUserWallet(doc: UserWalletDocument): UserWallet {
        return {
            id: doc._id.toString(),
            odaUserId: doc.odaUserId,
            subOrganizationId: doc.subOrganizationId,
            walletId: doc.walletId,
            solanaAddress: doc.solanaAddress,
            ethereumAddress: doc.ethereumAddress,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }
}