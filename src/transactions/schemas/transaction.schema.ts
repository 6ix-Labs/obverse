import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TransactionType {
  PAYMENT_IN = 'payment_in',
  PAYMENT_OUT = 'payment_out',
  SWAP = 'swap',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  TRANSFER = 'transfer',
  DEPOSIT = 'deposit',
}

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true, index: true })
  txSignature: string; // Transaction hash/signature (unique across chain)

  @Prop({ required: true, index: true })
  chain: string; // solana, ethereum, base, polygon, arbitrum, etc.

  @Prop({ required: true, index: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true })
  amount: number; // Main amount (for swaps, this is the input amount)

  @Prop({ required: true })
  token: string; // Main token (USDC, SOL, USDT, ETH, etc.)

  @Prop()
  tokenMintAddress?: string; // Token contract/mint address

  @Prop()
  fromAddress: string; // Source wallet address

  @Prop()
  toAddress: string; // Destination wallet address

  // For swap transactions
  @Prop()
  swapOutputAmount?: number; // Output amount for swaps

  @Prop()
  swapOutputToken?: string; // Output token for swaps

  @Prop()
  swapOutputTokenMintAddress?: string; // Output token contract/mint address

  @Prop()
  swapRate?: number; // Exchange rate (output/input)

  @Prop()
  swapProtocol?: string; // e.g., 'jupiter', 'uniswap', '1inch'

  // Related records
  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId; // Link to Payment if this was a payment link transaction

  @Prop({ type: Types.ObjectId, ref: 'PaymentLink' })
  paymentLinkId?: Types.ObjectId; // Link to PaymentLink if applicable

  @Prop()
  walletAddress?: string; // Which merchant wallet was used

  // Transaction status
  @Prop({ default: TransactionStatus.PENDING, index: true, enum: TransactionStatus })
  status: TransactionStatus;

  @Prop()
  confirmedAt?: Date;

  @Prop({ default: 0 })
  confirmations: number;

  // Blockchain details
  @Prop()
  blockNumber?: number; // For EVM chains

  @Prop()
  slot?: number; // For Solana

  @Prop()
  blockTime?: Date; // When the block was created

  @Prop()
  fee?: number; // Transaction fee paid

  @Prop()
  feeToken?: string; // Token used for fee (usually native token)

  // Additional data
  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional flexible data

  @Prop({ type: Object })
  customerData?: Record<string, string>; // Customer info for payment transactions

  @Prop()
  description?: string; // Human-readable description

  // Notification tracking
  @Prop({ default: false })
  webhookSent: boolean;

  @Prop({ default: false })
  notificationSent: boolean;

  // Error tracking
  @Prop()
  errorMessage?: string; // Error message if failed

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Compound indexes for common queries
TransactionSchema.index({ merchantId: 1, createdAt: -1 });
TransactionSchema.index({ merchantId: 1, type: 1, createdAt: -1 });
TransactionSchema.index({ merchantId: 1, chain: 1, createdAt: -1 });
TransactionSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ txSignature: 1, chain: 1 }, { unique: true });
