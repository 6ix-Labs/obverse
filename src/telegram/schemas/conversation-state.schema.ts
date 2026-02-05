import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationStateDocument = ConversationState & Document;

@Schema({ timestamps: true })
export class ConversationState {
  @Prop({ required: true, unique: true })
  telegramId: string;

  @Prop({ type: Types.ObjectId, ref: 'Merchant' })
  merchantId?: Types.ObjectId;

  @Prop({ required: true })
  currentCommand: string; // 'create', 'wallet', 'settings', etc.

  @Prop({ required: true })
  currentStep: string; // 'awaiting_custom_fields', 'awaiting_amount', etc.

  @Prop({ type: Object, default: {} })
  data: Record<string, any>; // Temporary data being collected

  @Prop({ default: Date.now })
  expiresAt: Date; // Auto-expire after 30 minutes of inactivity

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationStateSchema =
  SchemaFactory.createForClass(ConversationState);

// Add TTL index to auto-delete expired conversations
ConversationStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
