import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectModel(ApiKey.name)
    private apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  /**
   * Generate a new API key for a merchant
   */
  async generateApiKey(
    merchantId: string | Types.ObjectId,
    name: string,
    expiresAt?: Date,
  ): Promise<{ apiKey: ApiKeyDocument; plainKey: string }> {
    try {
      // Validate inputs
      if (!merchantId) {
        throw new BadRequestException('Merchant ID is required');
      }

      if (!name || name.trim().length === 0) {
        throw new BadRequestException('API key name is required');
      }

      if (name.length > 100) {
        throw new BadRequestException(
          'API key name must be less than 100 characters',
        );
      }

      // Generate secure random key
      // Format: obv_sk_<32 random hex characters>
      const randomPart = randomBytes(32).toString('hex');
      const plainKey = `obv_sk_${randomPart}`;

      // Hash the key for storage (NEW keys are hashed)
      const hashedKey = await bcrypt.hash(plainKey, 10);

      // Create API key document
      const apiKey = new this.apiKeyModel({
        key: hashedKey, // Now stored hashed
        name: name.trim(),
        merchantId: new Types.ObjectId(merchantId),
        isActive: true,
        expiresAt,
        metadata: {},
      });

      const saved = await apiKey.save();

      this.logger.log(`Generated API key "${name}" for merchant ${merchantId}`);

      return {
        apiKey: saved,
        plainKey, // Return plain key only once
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Error generating API key: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to generate API key');
    }
  }

  /**
   * List all API keys for a merchant
   */
  async listApiKeys(
    merchantId: string | Types.ObjectId,
  ): Promise<ApiKeyDocument[]> {
    try {
      if (!merchantId) {
        throw new BadRequestException('Merchant ID is required');
      }

      const keys = await this.apiKeyModel
        .find({ merchantId: new Types.ObjectId(merchantId) })
        .sort({ createdAt: -1 })
        .exec();

      return keys;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Error listing API keys: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to list API keys');
    }
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(
    keyId: string,
    merchantId: string | Types.ObjectId,
  ): Promise<ApiKeyDocument> {
    try {
      if (!keyId) {
        throw new BadRequestException('API key ID is required');
      }

      if (!merchantId) {
        throw new BadRequestException('Merchant ID is required');
      }

      const apiKey = await this.apiKeyModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(keyId),
            merchantId: new Types.ObjectId(merchantId),
          },
          { isActive: false },
          { new: true },
        )
        .exec();

      if (!apiKey) {
        throw new NotFoundException('API key not found');
      }

      this.logger.log(
        `Revoked API key "${apiKey.name}" for merchant ${merchantId}`,
      );

      return apiKey;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error revoking API key: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to revoke API key');
    }
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(
    keyId: string,
    merchantId: string | Types.ObjectId,
  ): Promise<void> {
    try {
      if (!keyId) {
        throw new BadRequestException('API key ID is required');
      }

      if (!merchantId) {
        throw new BadRequestException('Merchant ID is required');
      }

      const result = await this.apiKeyModel
        .deleteOne({
          _id: new Types.ObjectId(keyId),
          merchantId: new Types.ObjectId(merchantId),
        })
        .exec();

      if (result.deletedCount === 0) {
        throw new NotFoundException('API key not found');
      }

      this.logger.log(`Deleted API key ${keyId} for merchant ${merchantId}`);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error deleting API key: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to delete API key');
    }
  }

  /**
   * Validate an API key (used by guard)
   * Supports BOTH hashed and plaintext keys for backward compatibility
   */
  async validateApiKey(plainKey: string): Promise<ApiKeyDocument | null> {
    try {
      if (!plainKey || plainKey.trim().length === 0) {
        return null;
      }

      // BACKWARD COMPATIBILITY: First try plaintext match (old keys)
      const apiKey = await this.apiKeyModel
        .findOne({
          key: plainKey,
          isActive: true,
        })
        .populate('merchantId')
        .exec();

      // If found (old plaintext key), return it
      if (apiKey) {
        // Check expiration
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          return null;
        }
        return apiKey;
      }

      // NEW BEHAVIOR: Try hashed comparison (new keys)
      // Fetch all active keys and compare hashes
      const allActiveKeys = await this.apiKeyModel
        .find({ isActive: true })
        .populate('merchantId')
        .exec();

      for (const keyDoc of allActiveKeys) {
        // Check if key is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
        const isHashed = /^\$2[ayb]\$/.test(keyDoc.key);

        if (isHashed) {
          // Compare using bcrypt
          const isMatch = await bcrypt.compare(plainKey, keyDoc.key);
          if (isMatch) {
            // Check expiration
            if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
              return null;
            }
            return keyDoc;
          }
        }
      }

      // No match found
      return null;
    } catch (error) {
      this.logger.error(
        `Error validating API key: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Update API key usage timestamp
   */
  async touchApiKeyUsage(keyId: string | Types.ObjectId): Promise<void> {
    await this.apiKeyModel
      .updateOne(
        { _id: new Types.ObjectId(keyId) },
        { $set: { lastUsed: new Date() } },
      )
      .exec();
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(keyId: string): Promise<ApiKeyDocument> {
    try {
      if (!keyId) {
        throw new BadRequestException('API key ID is required');
      }

      const apiKey = await this.apiKeyModel
        .findById(new Types.ObjectId(keyId))
        .populate('merchantId')
        .exec();

      if (!apiKey) {
        throw new NotFoundException('API key not found');
      }

      return apiKey;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error getting API key: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get API key');
    }
  }
}
