import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentLinkDocument = PaymentLink & Document;

export class CustomField {
  @Prop({ required: true })
  fieldName: string;

  @Prop({ default: 'text' })
  fieldType: string; // text, email, tel, textarea, etc.

  @Prop({ default: true })
  required: boolean;
}

@Schema({ timestamps: true })
export class PaymentLink {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  linkId: string; // Short unique ID like 'x7k9m2'

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'USDC' })
  token: string; // USDC, SOL, USDT, ETH, etc.

  @Prop({ required: true, default: 'solana' })
  chain: string; // solana, ethereum, base, polygon, arbitrum, etc.

  @Prop()
  recipientWalletAddress: string; // Specific wallet address for this payment link

  @Prop()
  description?: string;

  @Prop({ type: [CustomField], default: [] })
  customFields: CustomField[];

  @Prop({ default: false })
  isReusable: boolean;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  paymentCount: number; // Track how many times this link has been paid

  @Prop()
  lastPaidAt?: Date;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentLinkSchema = SchemaFactory.createForClass(PaymentLink);
