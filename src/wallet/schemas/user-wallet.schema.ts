// src/wallet/schemas/user-wallet.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserWalletDocument = UserWalletModel & Document;

@Schema({
  timestamps: true,
  collection: 'user_wallets',
})
export class UserWalletModel {
  @Prop({ required: true, unique: true, index: true })
  odaUserId: string; // Telegram user id / external user id

  @Prop({ required: true })
  subOrganizationId: string;

  @Prop({ required: true })
  walletId: string;

  @Prop({ required: true, unique: true, index: true })
  solanaAddress: string;

  @Prop({ required: false })
  ethereumAddress?: string;

  // Timestamps are auto-managed by Mongoose with { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export const UserWalletSchema = SchemaFactory.createForClass(UserWalletModel);

// Add compound indexes if needed
UserWalletSchema.index({ odaUserId: 1, solanaAddress: 1 });
