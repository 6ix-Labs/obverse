import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DashboardSessionDocument = DashboardSession & Document;

@Schema({ timestamps: true })
export class DashboardSession {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'PaymentLink',
    required: true,
    index: true,
  })
  paymentLinkId: Types.ObjectId;

  @Prop({ required: true })
  passwordHash: string; // bcrypt hash of temporary password

  @Prop({ required: true, index: true })
  expiresAt: Date; // 2 hours from creation

  @Prop({ default: false })
  isUsed: boolean; // Track if password has been used to login

  @Prop({ default: false })
  isRevoked: boolean; // Allow manual revocation

  @Prop()
  lastUsedAt?: Date;

  @Prop()
  ipAddress?: string; // Track where it was used from

  @Prop()
  userAgent?: string; // Track browser/device

  createdAt: Date;
  updatedAt: Date;
}

export const DashboardSessionSchema =
  SchemaFactory.createForClass(DashboardSession);

// TTL index - MongoDB will auto-delete expired sessions
DashboardSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for faster queries
DashboardSessionSchema.index({
  merchantId: 1,
  paymentLinkId: 1,
  expiresAt: -1,
});
