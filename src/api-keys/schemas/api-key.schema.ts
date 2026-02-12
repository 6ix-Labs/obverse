import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApiKeyDocument = ApiKey & Document;

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({ required: true, unique: true, index: true })
  key: string; // The actual API key (hashed in production)

  @Prop({ required: true })
  name: string; // Friendly name for the key (e.g., "OpenClaw Production")

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId: Types.ObjectId; // Which merchant owns this key

  @Prop({ default: true })
  isActive: boolean; // Can be revoked by setting to false

  @Prop()
  lastUsed?: Date; // Track last usage

  @Prop()
  expiresAt?: Date; // Optional expiration date

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // Store additional info (IP restrictions, rate limits, etc.)

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// Indexes for performance
ApiKeySchema.index({ key: 1, isActive: 1 }); // Fast lookup for auth
ApiKeySchema.index({ merchantId: 1, isActive: 1 }); // List keys for merchant
ApiKeySchema.index({ expiresAt: 1 }); // Clean up expired keys
