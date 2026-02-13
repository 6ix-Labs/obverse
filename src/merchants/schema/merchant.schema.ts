import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MerchantDocument = Merchant & Document;

export class WalletConfig {
  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  chain: string; // 'solana', 'ethereum', 'base', 'polygon', etc.

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  label?: string; // Optional label like "Main Solana", "Base Wallet"
}

@Schema({ timestamps: true })
export class Merchant {
  @Prop({ unique: true, sparse: true })
  telegramId?: string;

  @Prop({ unique: true, sparse: true })
  farcasterFid?: string;

  @Prop()
  username?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  // Reference to the Turnkey-managed wallet
  @Prop({ type: Types.ObjectId, ref: 'UserWalletModel', required: false })
  turnkeyWalletId?: Types.ObjectId;

  @Prop({ required: true })
  walletAddress: string; // DEPRECATED: Keep for backward compatibility, use wallets array

  @Prop({ type: [WalletConfig], default: [] })
  wallets: WalletConfig[]; // Multi-chain wallet support

  @Prop({ default: 'USDC' })
  defaultToken: string; // USDC, SOL, USDT, ETH, etc.

  @Prop({ default: 'solana' })
  defaultChain: string; // Default chain for new payment links

  @Prop({ default: true })
  notificationsEnabled: boolean;

  @Prop()
  webhookUrl?: string; // For external payment notifications

  @Prop({ type: [String], default: [] })
  defaultCustomFields?: string[]; // Default fields to collect

  @Prop({ default: true })
  isActive: boolean;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const MerchantSchema = SchemaFactory.createForClass(Merchant);

// Index for quick lookups
MerchantSchema.index({ turnkeyWalletId: 1 });
