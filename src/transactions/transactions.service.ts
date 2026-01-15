import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument, TransactionStatus, TransactionType } from './schemas/transaction.schema';
import { DatabaseException } from '../core/exceptions/database.exception';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) { }

  /**
   * Create a new transaction record
   */
  async createTransaction(data: {
    merchantId: string;
    txSignature: string;
    chain: string;
    type: TransactionType;
    amount: number;
    token: string;
    tokenMintAddress?: string;
    fromAddress: string;
    toAddress: string;
    swapOutputAmount?: number;
    swapOutputToken?: string;
    swapOutputTokenMintAddress?: string;
    swapRate?: number;
    swapProtocol?: string;
    paymentId?: string;
    paymentLinkId?: string;
    walletAddress?: string;
    blockNumber?: number;
    slot?: number;
    fee?: number;
    feeToken?: string;
    metadata?: Record<string, any>;
    customerData?: Record<string, string>;
    description?: string;
  }): Promise<TransactionDocument> {
    // Check if transaction already exists
    const existing = await this.findByTxSignature(data.txSignature, data.chain);
    if (existing) {
      throw new BadRequestException('Transaction already recorded');
    }

    const transaction = new this.transactionModel({
      ...data,
      merchantId: new Types.ObjectId(data.merchantId),
      paymentId: data.paymentId ? new Types.ObjectId(data.paymentId) : undefined,
      paymentLinkId: data.paymentLinkId ? new Types.ObjectId(data.paymentLinkId) : undefined,
      status: TransactionStatus.PENDING,
    });

    return transaction.save();
  }

  /**
   * Find transaction by signature and chain
   */
  async findByTxSignature(
    txSignature: string,
    chain?: string,
  ): Promise<TransactionDocument | null> {
    try {
      if (!txSignature || txSignature.trim().length === 0) {
        throw new BadRequestException('Transaction signature is required');
      }

      const query: any = { txSignature };
      if (chain) {
        query.chain = chain;
      }
      return this.transactionModel.findOne(query);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Error finding transaction by signature ${txSignature}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to find transaction', 'findOne');
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<TransactionDocument> {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('Transaction ID is required');
      }

      const transaction = await this.transactionModel.findById(id);
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }
      return transaction;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error finding transaction by ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to find transaction', 'findById');
    }
  }

  /**
   * Get all transactions for a merchant
   */
  async findByMerchantId(
    merchantId: string,
    options?: {
      limit?: number;
      skip?: number;
      type?: TransactionType;
      chain?: string;
      status?: TransactionStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<TransactionDocument[]> {
    try {
      if (!merchantId || merchantId.trim().length === 0) {
        throw new BadRequestException('Merchant ID is required');
      }

      const query: any = { merchantId: new Types.ObjectId(merchantId) };

      if (options?.type) query.type = options.type;
      if (options?.chain) query.chain = options.chain;
      if (options?.status) query.status = options.status;

      if (options?.startDate || options?.endDate) {
        query.createdAt = {};
        if (options.startDate) query.createdAt.$gte = options.startDate;
        if (options.endDate) query.createdAt.$lte = options.endDate;
      }

      return this.transactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(options?.limit || 100)
        .skip(options?.skip || 0)
        .populate('paymentId')
        .populate('paymentLinkId');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Error finding transactions for merchant ${merchantId}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to find transactions', 'find');
    }
  }

  /**
   * Get transactions by payment ID
   */
  async findByPaymentId(paymentId: string): Promise<TransactionDocument[]> {
    return this.transactionModel
      .find({ paymentId: new Types.ObjectId(paymentId) })
      .sort({ createdAt: -1 });
  }

  /**
   * Confirm a transaction
   */
  async confirmTransaction(
    txSignature: string,
    confirmations: number,
    chain?: string,
    blockTime?: Date,
  ): Promise<TransactionDocument> {
    const query: any = { txSignature };
    if (chain) query.chain = chain;

    const transaction = await this.transactionModel.findOneAndUpdate(
      query,
      {
        status: TransactionStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmations,
        blockTime,
      },
      { new: true },
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Mark transaction as failed
   */
  async failTransaction(
    txSignature: string,
    errorMessage: string,
    chain?: string,
  ): Promise<TransactionDocument> {
    const query: any = { txSignature };
    if (chain) query.chain = chain;

    const transaction = await this.transactionModel.findOneAndUpdate(
      query,
      {
        status: TransactionStatus.FAILED,
        errorMessage,
      },
      { new: true },
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Update transaction confirmations
   */
  async updateConfirmations(
    txSignature: string,
    confirmations: number,
    chain?: string,
  ): Promise<TransactionDocument> {
    const query: any = { txSignature };
    if (chain) query.chain = chain;

    const transaction = await this.transactionModel.findOneAndUpdate(
      query,
      { confirmations },
      { new: true },
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Mark webhook as sent
   */
  async markWebhookSent(transactionId: string): Promise<void> {
    await this.transactionModel.findByIdAndUpdate(transactionId, {
      webhookSent: true,
    });
  }

  /**
   * Mark notification as sent
   */
  async markNotificationSent(transactionId: string): Promise<void> {
    await this.transactionModel.findByIdAndUpdate(transactionId, {
      notificationSent: true,
    });
  }

  /**
   * Get transaction statistics for a merchant
   */
  async getTransactionStats(
    merchantId: string,
    options?: {
      type?: TransactionType;
      chain?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    totalTransactions: number;
    totalVolume: number;
    totalFees: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    failedTransactions: number;
    byType: Record<string, { count: number; volume: number }>;
    byChain: Record<string, { count: number; volume: number }>;
  }> {
    const matchQuery: any = { merchantId: new Types.ObjectId(merchantId) };

    if (options?.type) matchQuery.type = options.type;
    if (options?.chain) matchQuery.chain = options.chain;
    if (options?.startDate || options?.endDate) {
      matchQuery.createdAt = {};
      if (options.startDate) matchQuery.createdAt.$gte = options.startDate;
      if (options.endDate) matchQuery.createdAt.$lte = options.endDate;
    }

    const [stats, byType, byChain] = await Promise.all([
      // Overall stats
      this.transactionModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            volume: { $sum: '$amount' },
            fees: { $sum: '$fee' },
          },
        },
      ]),
      // By type
      this.transactionModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            volume: { $sum: '$amount' },
          },
        },
      ]),
      // By chain
      this.transactionModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$chain',
            count: { $sum: 1 },
            volume: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const result = {
      totalTransactions: 0,
      totalVolume: 0,
      totalFees: 0,
      pendingTransactions: 0,
      confirmedTransactions: 0,
      failedTransactions: 0,
      byType: {} as Record<string, { count: number; volume: number }>,
      byChain: {} as Record<string, { count: number; volume: number }>,
    };

    // Process status stats
    stats.forEach((stat) => {
      result.totalTransactions += stat.count;
      result.totalVolume += stat.volume || 0;
      result.totalFees += stat.fees || 0;

      if (stat._id === TransactionStatus.PENDING) result.pendingTransactions = stat.count;
      if (stat._id === TransactionStatus.CONFIRMED) result.confirmedTransactions = stat.count;
      if (stat._id === TransactionStatus.FAILED) result.failedTransactions = stat.count;
    });

    // Process type stats
    byType.forEach((stat) => {
      result.byType[stat._id] = {
        count: stat.count,
        volume: stat.volume || 0,
      };
    });

    // Process chain stats
    byChain.forEach((stat) => {
      result.byChain[stat._id] = {
        count: stat.count,
        volume: stat.volume || 0,
      };
    });

    return result;
  }

  /**
   * Get recent swap transactions
   */
  async getRecentSwaps(
    merchantId: string,
    limit = 10,
  ): Promise<TransactionDocument[]> {
    return this.transactionModel
      .find({
        merchantId: new Types.ObjectId(merchantId),
        type: TransactionType.SWAP,
      })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Count total transactions
   */
  async countByMerchant(
    merchantId: string,
    status?: TransactionStatus,
  ): Promise<number> {
    const query: any = { merchantId: new Types.ObjectId(merchantId) };
    if (status) query.status = status;
    return this.transactionModel.countDocuments(query);
  }
}
