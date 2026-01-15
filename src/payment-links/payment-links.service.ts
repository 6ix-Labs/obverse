import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { nanoid } from 'nanoid';
import { CustomField, PaymentLink, PaymentLinkDocument } from './schemas/payment-links.schema';
import { DatabaseException } from '../core/exceptions/database.exception';

@Injectable()
export class PaymentLinksService {
  private readonly logger = new Logger(PaymentLinksService.name);

  constructor(
    @InjectModel(PaymentLink.name) private paymentLinkModel: Model<PaymentLinkDocument>,
  ) { }

  async createPaymentLink(data: {
    merchantId: string;
    amount: number;
    token: string;
    chain?: string;
    recipientWalletAddress?: string;
    description?: string;
    customFields: CustomField[];
    isReusable: boolean;
    expiresAt?: Date;
  }): Promise<PaymentLinkDocument> {
    try {
      // Validation
      if (!data.merchantId || data.merchantId.trim().length === 0) {
        throw new BadRequestException('Merchant ID is required');
      }

      if (!data.amount || data.amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      if (!data.token || data.token.trim().length === 0) {
        throw new BadRequestException('Token is required');
      }

      if (data.expiresAt && data.expiresAt < new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }

      const linkId = nanoid(8); // Generate short unique ID

      const paymentLink = new this.paymentLinkModel({
        ...data,
        linkId,
        chain: data.chain || 'solana', // Default to Solana for backward compatibility
      });

      this.logger.log(`Creating payment link ${linkId} for merchant ${data.merchantId}`);

      const savedLink = await paymentLink.save();

      this.logger.log(`Payment link created successfully: ${linkId}`);
      return savedLink;
    } catch (error) {
      this.logger.error(
        `Error creating payment link: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new DatabaseException('Failed to create payment link', 'create');
    }
  }

  async findByLinkId(linkId: string): Promise<PaymentLinkDocument> {
    try {
      if (!linkId || linkId.trim().length === 0) {
        throw new BadRequestException('Link ID is required');
      }

      const link = await this.paymentLinkModel.findOne({ linkId, isActive: true });

      if (!link) {
        this.logger.warn(`Payment link not found: ${linkId}`);
        throw new NotFoundException('Payment link not found');
      }

      // Check if expired
      if (link.expiresAt && link.expiresAt < new Date()) {
        this.logger.warn(`Payment link expired: ${linkId}`);
        throw new BadRequestException('Payment link has expired');
      }

      // Check if one-time link already used
      if (!link.isReusable && link.paymentCount > 0) {
        this.logger.warn(`Payment link already used: ${linkId}`);
        throw new BadRequestException('Payment link has already been used');
      }

      return link;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error finding payment link ${linkId}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to retrieve payment link', 'findOne');
    }
  }

  async findByLinkIdWithMerchant(linkId: string): Promise<PaymentLinkDocument> {
    try {
      if (!linkId || linkId.trim().length === 0) {
        throw new BadRequestException('Link ID is required');
      }

      const link = await this.paymentLinkModel
        .findOne({ linkId, isActive: true })
        .populate('merchantId', 'walletAddress wallets');

      if (!link) {
        this.logger.warn(`Payment link not found: ${linkId}`);
        throw new NotFoundException('Payment link not found');
      }

      // Check if expired
      if (link.expiresAt && link.expiresAt < new Date()) {
        this.logger.warn(`Payment link expired: ${linkId}`);
        throw new BadRequestException('Payment link has expired');
      }

      // Check if one-time link already used
      if (!link.isReusable && link.paymentCount > 0) {
        this.logger.warn(`Payment link already used: ${linkId}`);
        throw new BadRequestException('Payment link has already been used');
      }

      return link;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error finding payment link ${linkId}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to retrieve payment link', 'findOne');
    }
  }

  async findByMerchantId(merchantId: string, limit = 50): Promise<PaymentLinkDocument[]> {
    try {
      if (!merchantId || merchantId.trim().length === 0) {
        throw new BadRequestException('Merchant ID is required');
      }

      if (limit <= 0 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      return this.paymentLinkModel
        .find({ merchantId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Error finding payment links for merchant ${merchantId}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to retrieve payment links', 'find');
    }
  }

  async findById(id: string): Promise<PaymentLinkDocument> {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('Payment link ID is required');
      }

      const link = await this.paymentLinkModel.findById(id);

      if (!link) {
        throw new NotFoundException('Payment link not found');
      }

      return link;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error finding payment link by ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to retrieve payment link', 'findById');
    }
  }

  async incrementPaymentCount(linkId: string): Promise<void> {
    try {
      if (!linkId || linkId.trim().length === 0) {
        throw new BadRequestException('Link ID is required');
      }

      const result = await this.paymentLinkModel.findOneAndUpdate(
        { linkId },
        {
          $inc: { paymentCount: 1 },
          $set: { lastPaidAt: new Date() },
        },
      );

      if (!result) {
        throw new NotFoundException('Payment link not found');
      }

      this.logger.log(`Payment count incremented for link: ${linkId}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error incrementing payment count for ${linkId}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to update payment count', 'update');
    }
  }

  async deactivateLink(linkId: string, merchantId: string): Promise<PaymentLinkDocument> {
    try {
      if (!linkId || linkId.trim().length === 0) {
        throw new BadRequestException('Link ID is required');
      }

      if (!merchantId || merchantId.trim().length === 0) {
        throw new BadRequestException('Merchant ID is required');
      }

      const link = await this.paymentLinkModel.findOneAndUpdate(
        { linkId, merchantId },
        { isActive: false },
        { new: true },
      );

      if (!link) {
        throw new NotFoundException('Payment link not found');
      }

      this.logger.log(`Payment link deactivated: ${linkId}`);
      return link;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error deactivating payment link ${linkId}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to deactivate payment link', 'update');
    }
  }

  async getLinkStats(linkId: string): Promise<{
    link: PaymentLinkDocument;
    totalPayments: number;
    totalAmount: number;
  }> {
    try {
      if (!linkId || linkId.trim().length === 0) {
        throw new BadRequestException('Link ID is required');
      }

      const link = await this.findByLinkId(linkId);

      return {
        link,
        totalPayments: link.paymentCount,
        totalAmount: link.amount * link.paymentCount,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error getting stats for payment link ${linkId}: ${error.message}`,
        error.stack,
      );
      throw new DatabaseException('Failed to retrieve payment link statistics', 'stats');
    }
  }
}
