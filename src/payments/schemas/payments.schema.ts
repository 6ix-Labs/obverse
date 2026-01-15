
// src/modules/payments/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'PaymentLink', required: true })
  paymentLinkId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true })
  txSignature: string; // Transaction signature/hash (Solana signature or EVM tx hash)

  @Prop({ required: true })
  chain: string; // solana, ethereum, base, polygon, arbitrum, etc.

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  token: string; // USDC, SOL, USDT, ETH, etc.

  @Prop()
  tokenMintAddress?: string; // For Solana SPL tokens or EVM token contract address

  @Prop()
  fromAddress: string; // Payer's wallet address

  @Prop()
  toAddress: string; // Recipient wallet address

  @Prop({ type: Object, default: {} })
  customerData: Record<string, string>; // Dynamic customer fields

  @Prop({ default: PaymentStatus.PENDING, enum: PaymentStatus })
  status: PaymentStatus;

  @Prop()
  confirmedAt?: Date;

  @Prop({ default: 0 })
  confirmations: number;

  @Prop()
  blockNumber?: number; // For EVM chains

  @Prop()
  slot?: number; // For Solana

  @Prop({ default: false })
  webhookSent: boolean;

  @Prop({ default: false })
  notificationSent: boolean;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
