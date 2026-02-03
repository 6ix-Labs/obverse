import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { customAlphabet } from 'nanoid';
import { DashboardSession, DashboardSessionDocument } from './schemas/dashboard-session.schema';
import { Merchant, MerchantDocument } from '../merchants/schema/merchant.schema';

// Generate readable password: 12 chars, alphanumeric (excluding ambiguous chars)
const generatePassword = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
  12
);

@Injectable()
export class DashboardAuthService {
  private readonly logger = new Logger(DashboardAuthService.name);

  constructor(
    @InjectModel(DashboardSession.name)
    private dashboardSessionModel: Model<DashboardSessionDocument>,
    @InjectModel(Merchant.name)
    private merchantModel: Model<MerchantDocument>,
    private jwtService: JwtService,
  ) {}

  /**
   * Generate temporary password for a specific payment link
   * Called by Telegram bot /dashboard command
   */
  async generateTemporaryPassword(merchantId: string, paymentLinkId: string) {
    const merchant = await this.merchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Generate random password
    const temporaryPassword = generatePassword();

    // Hash it (10 rounds is secure and fast enough)
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Set expiration (2 hours from now)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    // Create new session for this specific payment link
    await this.dashboardSessionModel.create({
      merchantId: new Types.ObjectId(merchantId),
      paymentLinkId: new Types.ObjectId(paymentLinkId),
      passwordHash,
      expiresAt,
    });

    this.logger.log(`Generated temporary password for merchant ${merchantId}, payment link ${paymentLinkId}, expires at ${expiresAt}`);

    // Return credentials with merchant's Telegram username or ID
    const identifier = merchant.username || merchant.telegramId || merchant._id.toString();

    return {
      identifier: identifier.startsWith('@') ? identifier : `@${identifier}`,
      temporaryPassword,
      expiresAt,
    };
  }

  /**
   * Validate login credentials
   * Called by POST /auth/login
   */
  async validateCredentials(
    identifier: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Clean identifier (remove @ if present)
    const cleanIdentifier = identifier.replace('@', '').trim();

    // Find merchant by username or telegramId
    const merchant = await this.merchantModel.findOne({
      $or: [
        { username: cleanIdentifier },
        { telegramId: cleanIdentifier },
      ],
    });

    if (!merchant) {
      this.logger.warn(`Login attempt with invalid identifier: ${cleanIdentifier}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find active, non-expired session for this merchant
    const session = await this.dashboardSessionModel.findOne({
      merchantId: merchant._id,
      expiresAt: { $gt: new Date() },
      isRevoked: false,
    }).sort({ createdAt: -1 }); // Get most recent session

    if (!session) {
      this.logger.warn(`No valid session found for merchant ${merchant._id}`);
      throw new UnauthorizedException('No valid session. Generate new password from Telegram bot using /dashboard');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, session.passwordHash);
    if (!isValid) {
      this.logger.warn(`Invalid password attempt for merchant ${merchant._id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update session usage tracking
    session.isUsed = true;
    session.lastUsedAt = new Date();
    if (ipAddress) session.ipAddress = ipAddress;
    if (userAgent) session.userAgent = userAgent;
    await session.save();

    this.logger.log(`Successful login for merchant ${merchant._id} for payment link ${session.paymentLinkId.toString()}`);

    // Generate JWT token (valid for 2 hours, same as password)
    const payload = {
      sub: merchant._id.toString(),
      telegramId: merchant.telegramId,
      username: merchant.username,
      paymentLinkId: session.paymentLinkId.toString(),
      sessionId: session._id.toString(),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '2h',
    });

    return {
      accessToken,
      merchant: {
        id: merchant._id,
        telegramId: merchant.telegramId,
        username: merchant.username,
        firstName: merchant.firstName,
        lastName: merchant.lastName,
      },
      paymentLinkId: session.paymentLinkId.toString(),
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Revoke all active sessions for merchant
   * Useful when merchant wants to logout from all devices
   */
  async revokeAllSessions(merchantId: string) {
    const result = await this.dashboardSessionModel.updateMany(
      {
        merchantId,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
      },
      { isRevoked: true }
    );

    this.logger.log(`Revoked ${result.modifiedCount} sessions for merchant ${merchantId}`);
    return result.modifiedCount;
  }

  /**
   * Cleanup expired sessions
   * Can be called by a cron job
   * Note: MongoDB TTL index will handle this automatically,
   * but this method can be used for manual cleanup
   */
  async cleanupExpiredSessions() {
    const result = await this.dashboardSessionModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    this.logger.log(`Cleaned up ${result.deletedCount} expired sessions`);
    return result.deletedCount;
  }

  /**
   * Get active sessions for merchant
   * For debugging/admin purposes
   */
  async getActiveSessions(merchantId: string) {
    return this.dashboardSessionModel.find({
      merchantId: new Types.ObjectId(merchantId),
      expiresAt: { $gt: new Date() },
      isRevoked: false,
    }).sort({ createdAt: -1 });
  }
}
