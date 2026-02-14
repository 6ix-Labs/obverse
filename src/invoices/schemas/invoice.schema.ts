import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
    DRAFT = 'draft',
    SENT = 'sent',
    PAID = 'paid',
    OVERDUE = 'overdue',
    CANCELLED = 'cancelled',
}

export class LineItem {
    @Prop({ required: true })
    description: string;

    @Prop({ required: true, default: 1 })
    quantity: number;

    @Prop({ required: true })
    unitPrice: number;

    @Prop({ required: true })
    amount: number; // quantity * unitPrice
}

@Schema({ timestamps: true })
export class Invoice {
    @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
    merchantId: Types.ObjectId;

    @Prop({ required: true })
    invoiceNumber: string; // INV-001, INV-002, etc. (per merchant)

    @Prop({ required: true })
    recipientEmail: string;

    @Prop()
    recipientName?: string;

    @Prop({ type: [LineItem], required: true })
    lineItems: LineItem[];

    @Prop({ required: true })
    subtotal: number;

    @Prop({ required: true })
    total: number;

    @Prop({ required: true, default: 'USDC' })
    token: string;

    @Prop({ required: true, default: 'solana' })
    chain: string;

    @Prop({ default: InvoiceStatus.SENT, enum: InvoiceStatus })
    status: InvoiceStatus;

    @Prop({ required: true })
    dueDate: Date;

    @Prop({ type: Types.ObjectId, ref: 'PaymentLink' })
    paymentLinkId?: Types.ObjectId;

    @Prop()
    paymentUrl?: string; // The payment link URL

    @Prop({ type: Types.ObjectId, ref: 'Payment' })
    paymentId?: Types.ObjectId;

    @Prop()
    paidAt?: Date;

    @Prop()
    notes?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Compound index for listing invoices by merchant
InvoiceSchema.index({ merchantId: 1, createdAt: -1 });

// Unique invoice number per merchant
InvoiceSchema.index({ merchantId: 1, invoiceNumber: 1 }, { unique: true });

// Quick lookup by status
InvoiceSchema.index({ status: 1 });

// Lookup by paymentLinkId (for auto-linking payments)
InvoiceSchema.index({ paymentLinkId: 1 });
