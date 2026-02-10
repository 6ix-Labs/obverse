import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schemas/payments.schema';
import { TransactionsService } from 'src/transactions/transactions.service';
import { TransactionType } from 'src/transactions/schemas/transaction.schema';
import { PaymentLinksService } from 'src/payment-links/payment-links.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private transactionsService: TransactionsService,
    private paymentLinksService: PaymentLinksService,
  ) {}

  /**
   * Create payment from frontend after blockchain transaction
   * This is the public endpoint that the frontend calls
   */
  async createPaymentFromFrontend(
    dto: CreatePaymentDto,
  ): Promise<PaymentDocument> {
    // 1. Validate and get the payment link
    const paymentLink = await this.paymentLinksService.findByLinkIdWithMerchant(
      dto.linkCode,
    );

    // 2. Validate the payment amount matches the link
    if (dto.amount < paymentLink.amount) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) is less than required (${paymentLink.amount})`,
      );
    }

    // 3. Validate the token matches
    if (dto.token.toUpperCase() !== paymentLink.token.toUpperCase()) {
      throw new BadRequestException(
        `Payment token (${dto.token}) does not match required token (${paymentLink.token})`,
      );
    }

    // 4. Validate the chain matches
    if (dto.chain.toLowerCase() !== paymentLink.chain.toLowerCase()) {
      throw new BadRequestException(
        `Payment chain (${dto.chain}) does not match required chain (${paymentLink.chain})`,
      );
    }

    // 5. Determine if payment should be marked as confirmed
    // Default to true if not specified (frontend calls this after transaction succeeds)
    const isConfirmed = dto.isConfirmed !== false; // defaults to true
    const confirmations = dto.confirmations || (isConfirmed ? 1 : 0);

    // 6. Create the payment record
    // Extract merchantId - handle both populated (object) and non-populated (ObjectId) cases
    const merchantId =
      typeof paymentLink.merchantId === 'object' && paymentLink.merchantId._id
        ? paymentLink.merchantId._id.toString()
        : paymentLink.merchantId.toString();

    let payment: PaymentDocument;
    try {
      payment = await this.createPayment({
        paymentLinkId: paymentLink._id.toString(),
        merchantId: merchantId,
        txSignature: dto.txSignature,
        chain: dto.chain,
        amount: dto.amount,
        token: dto.token,
        tokenMintAddress: dto.tokenMintAddress,
        fromAddress: dto.fromAddress,
        toAddress: dto.toAddress,
        customerData: dto.customerData || {},
        blockNumber: dto.blockNumber,
        slot: dto.slot,
      });
    } catch (error) {
      // Handle duplicate key error from MongoDB unique index
      if (error.code === 11000 || error.name === 'MongoServerError') {
        this.logger.warn(
          `Duplicate payment attempt for tx ${dto.txSignature} on chain ${dto.chain}`,
        );
        // Return the existing payment instead of throwing error
        const existingPayment = await this.findByTxSignature(
          dto.txSignature,
          dto.chain,
        );
        if (existingPayment) {
          return existingPayment;
        }
      }
      // Re-throw other errors
      throw error;
    }

    // 8. If confirmed, update the payment status
    if (isConfirmed) {
      await this.paymentModel.findByIdAndUpdate(payment._id, {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmations: confirmations,
      });

      // Also update the transaction status
      try {
        await this.transactionsService.confirmTransaction(
          dto.txSignature,
          confirmations,
          dto.chain,
          new Date(),
        );
      } catch (error) {
        this.logger.error(
          `Failed to confirm transaction ${dto.txSignature}: ${error.message}`,
        );
      }
    }

    // 9. Increment payment counter on the payment link
    try {
      await this.paymentLinksService.incrementPaymentCount(dto.linkCode);
    } catch (error) {
      this.logger.error(
        `Failed to increment payment count for link ${dto.linkCode}: ${error.message}`,
      );
      // Don't fail the payment creation if this fails
    }

    this.logger.log(
      `Payment created from frontend: ${payment._id} for link ${dto.linkCode} (status: ${isConfirmed ? 'confirmed' : 'pending'})`,
    );

    // Return the updated payment with confirmed status
    const updatedPayment = await this.paymentModel.findById(payment._id);
    if (!updatedPayment) {
      throw new NotFoundException(
        `Payment ${payment._id} not found after creation`,
      );
    }
    return updatedPayment;
  }

  async createPayment(data: {
    paymentLinkId: string;
    merchantId: string;
    txSignature: string;
    chain: string;
    amount: number;
    token: string;
    tokenMintAddress?: string;
    fromAddress: string;
    toAddress: string;
    customerData: Record<string, string>;
    blockNumber?: number;
    slot?: number;
  }): Promise<PaymentDocument> {
    const payment = new this.paymentModel({
      ...data,
      paymentLinkId: new Types.ObjectId(data.paymentLinkId),
      merchantId: new Types.ObjectId(data.merchantId),
      status: PaymentStatus.PENDING,
    });

    const savedPayment = await payment.save();

    // Also create a transaction record
    try {
      // Check if transaction already exists first to avoid duplicate error
      const existingTx = await this.transactionsService.findByTxSignature(
        data.txSignature,
        data.chain,
      );

      if (!existingTx) {
        await this.transactionsService.createTransaction({
          merchantId: data.merchantId,
          txSignature: data.txSignature,
          chain: data.chain,
          type: TransactionType.PAYMENT_IN,
          amount: data.amount,
          token: data.token,
          tokenMintAddress: data.tokenMintAddress,
          fromAddress: data.fromAddress,
          toAddress: data.toAddress,
          paymentId: savedPayment._id.toString(),
          paymentLinkId: data.paymentLinkId,
          customerData: data.customerData,
          blockNumber: data.blockNumber,
          slot: data.slot,
          description: `Payment from ${data.customerData?.name || data.customerData?.email || 'customer'}`,
        });
        this.logger.log(
          `Transaction record created for payment ${savedPayment._id}`,
        );
      } else {
        this.logger.warn(
          `Transaction ${data.txSignature} already exists, skipping creation`,
        );
      }
    } catch (error) {
      // Log error but don't fail the payment creation
      this.logger.error(
        `Failed to create transaction record: ${error.message}`,
        error.stack,
      );
    }

    return savedPayment;
  }

  async findByTxSignature(
    txSignature: string,
    chain?: string,
  ): Promise<PaymentDocument | null> {
    const query: any = { txSignature };
    if (chain) {
      query.chain = chain;
    }
    return this.paymentModel.findOne(query);
  }

  async findByPaymentLinkId(paymentLinkId: string): Promise<PaymentDocument[]> {
    // Query with STRING since paymentLinkId is stored as string in DB (not ObjectId)
    return this.paymentModel
      .find({ paymentLinkId: paymentLinkId })
      .sort({ createdAt: -1 });
  }

  /**
   * Find payments by payment link ID with filters and pagination
   * Returns both the filtered payments and total count
   */
  async findByPaymentLinkIdWithFilters(
    paymentLinkId: string,
    options?: {
      limit?: number;
      skip?: number;
      token?: string;
      chain?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    },
  ): Promise<{ payments: PaymentDocument[]; total: number }> {
    try {
      // Build the query object
      const query: any = { paymentLinkId: paymentLinkId };

      // Apply optional filters
      if (options?.token) {
        query.token = options.token;
      }

      if (options?.chain) {
        query.chain = options.chain;
      }

      // Apply date range filters
      if (options?.startDate || options?.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.createdAt.$lte = options.endDate;
        }
      }

      // Apply search filter across multiple fields
      if (options?.search) {
        const searchTerm = options.search.trim();

        // Try to parse as number for amount search
        const numericSearch = parseFloat(searchTerm);

        query.$or = [
          // Search in transaction signature (partial, case-insensitive)
          { txSignature: { $regex: searchTerm, $options: 'i' } },
          // Search in fromAddress (partial, case-insensitive)
          { fromAddress: { $regex: searchTerm, $options: 'i' } },
          // Search in toAddress (partial, case-insensitive)
          { toAddress: { $regex: searchTerm, $options: 'i' } },
        ];

        // Add amount search if the search term is a valid number
        if (!isNaN(numericSearch)) {
          query.$or.push({ amount: numericSearch });
        }

        // Search in customer data fields (if they exist)
        // Note: This searches for the search term in any customer data value
        query.$or.push({
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $objectToArray: '$customerData' },
                    as: 'item',
                    cond: {
                      $regexMatch: {
                        input: { $toString: '$$item.v' },
                        regex: searchTerm,
                        options: 'i',
                      },
                    },
                  },
                },
              },
              0,
            ],
          },
        });
      }

      // Execute query with pagination and get total count
      const [payments, total] = await Promise.all([
        this.paymentModel
          .find(query)
          .sort({ createdAt: -1 })
          .limit(options?.limit || 50)
          .skip(options?.skip || 0)
          .exec(),
        this.paymentModel.countDocuments(query),
      ]);

      return { payments, total };
    } catch (error) {
      this.logger.error(
        `Error finding payments for payment link ${paymentLinkId} with filters: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByMerchantId(
    merchantId: string,
    limit = 100,
  ): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async confirmPayment(
    txSignature: string,
    confirmations: number,
    chain?: string,
  ): Promise<PaymentDocument> {
    const query: any = { txSignature };
    if (chain) {
      query.chain = chain;
    }

    const payment = await this.paymentModel.findOneAndUpdate(
      query,
      {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmations,
      },
      { new: true },
    );

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Also confirm the transaction record
    try {
      await this.transactionsService.confirmTransaction(
        txSignature,
        confirmations,
        chain,
      );
    } catch (error) {
      console.error('Failed to confirm transaction record:', error);
    }

    return payment;
  }

  async markWebhookSent(paymentId: string): Promise<void> {
    await this.paymentModel.findByIdAndUpdate(paymentId, {
      webhookSent: true,
    });
  }

  async markNotificationSent(paymentId: string): Promise<void> {
    await this.paymentModel.findByIdAndUpdate(paymentId, {
      notificationSent: true,
    });
  }

  async getPaymentStats(
    merchantId: string,
    chain?: string,
  ): Promise<{
    totalPayments: number;
    totalAmount: number;
    pendingPayments: number;
    confirmedPayments: number;
  }> {
    const matchQuery: any = {
      merchantId: new Types.ObjectId(merchantId),
      status: PaymentStatus.CONFIRMED,
    };
    if (chain) {
      matchQuery.chain = chain;
    }

    const pendingQuery: any = {
      merchantId: new Types.ObjectId(merchantId),
      status: PaymentStatus.PENDING,
    };
    if (chain) {
      pendingQuery.chain = chain;
    }

    const confirmedQuery: any = {
      merchantId: new Types.ObjectId(merchantId),
      status: PaymentStatus.CONFIRMED,
    };
    if (chain) {
      confirmedQuery.chain = chain;
    }

    const [totalStats, pendingCount, confirmedCount] = await Promise.all([
      this.paymentModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
      this.paymentModel.countDocuments(pendingQuery),
      this.paymentModel.countDocuments(confirmedQuery),
    ]);

    return {
      totalPayments: totalStats[0]?.totalPayments || 0,
      totalAmount: totalStats[0]?.totalAmount || 0,
      pendingPayments: pendingCount,
      confirmedPayments: confirmedCount,
    };
  }

  async findByPaymentLinkCode(linkCode: string): Promise<PaymentDocument[]> {
    // Validate link code
    if (!linkCode || linkCode.trim().length === 0) {
      throw new BadRequestException('Payment link code is required');
    }

    // First, find the payment link by code
    const paymentLink = await this.paymentLinksService.findByLinkId(linkCode);

    // Query with STRING since paymentLinkId is stored as string in DB (not ObjectId)
    return this.paymentModel
      .find({ paymentLinkId: paymentLink._id.toString() })
      .sort({ createdAt: -1 })
      .populate('paymentLinkId');
  }
}
