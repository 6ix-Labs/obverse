import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    Invoice,
    InvoiceDocument,
    InvoiceStatus,
} from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentLinksService } from '../payment-links/payment-links.service';

@Injectable()
export class InvoicesService {
    private readonly logger = new Logger(InvoicesService.name);

    constructor(
        @InjectModel(Invoice.name)
        private invoiceModel: Model<InvoiceDocument>,
        @Inject(forwardRef(() => PaymentLinksService))
        private paymentLinksService: PaymentLinksService,
    ) { }

    /**
     * Generate next sequential invoice number for a merchant
     * Format: INV-001, INV-002, etc.
     */
    private async getNextInvoiceNumber(merchantId: string): Promise<string> {
        const lastInvoice = await this.invoiceModel
            .findOne({ merchantId: new Types.ObjectId(merchantId) })
            .sort({ createdAt: -1 })
            .select('invoiceNumber')
            .lean();

        if (!lastInvoice) {
            return 'INV-001';
        }

        const lastNum = parseInt(lastInvoice.invoiceNumber.replace('INV-', ''), 10);
        const nextNum = (lastNum + 1).toString().padStart(3, '0');
        return `INV-${nextNum}`;
    }

    /**
     * Create an invoice with line items and auto-generate a payment link
     */
    async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceDocument> {
        if (!dto.merchantId) {
            throw new BadRequestException('Merchant ID is required');
        }
        const merchantId = dto.merchantId;

        // Calculate line item amounts and totals
        const lineItems = dto.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
        }));

        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const total = subtotal;

        if (total <= 0) {
            throw new BadRequestException('Invoice total must be greater than 0');
        }

        const token = dto.token || 'USDC';
        const chain = dto.chain || 'solana';

        // Generate sequential invoice number
        const invoiceNumber = await this.getNextInvoiceNumber(merchantId);

        // Auto-create a one-time payment link for this invoice
        const description = `Invoice ${invoiceNumber} - ${dto.recipientName || dto.recipientEmail}`;
        const paymentLink = await this.paymentLinksService.createPaymentLink({
            merchantId: merchantId,
            amount: total,
            token,
            chain,
            description,
            customFields: [
                { fieldName: 'email', fieldType: 'email', required: true },
                { fieldName: 'name', fieldType: 'text', required: false },
            ],
            isReusable: false,
        });

        const baseUrl = process.env.PAYMENT_URL || 'https://pay.obverse.app';
        const paymentUrl = `${baseUrl}/${paymentLink.linkId}`;

        // Calculate due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dto.dueDays);

        // Create the invoice
        const invoice = new this.invoiceModel({
            merchantId: new Types.ObjectId(merchantId),
            invoiceNumber,
            recipientEmail: dto.recipientEmail,
            recipientName: dto.recipientName,
            lineItems,
            subtotal,
            total,
            token,
            chain,
            status: InvoiceStatus.SENT,
            dueDate,
            paymentLinkId: paymentLink._id,
            paymentUrl,
            notes: dto.notes,
        });

        const saved = await invoice.save();
        this.logger.log(
            `Invoice ${invoiceNumber} created for ${dto.recipientEmail} — $${total} ${token} due ${dueDate.toISOString().split('T')[0]}`,
        );

        return saved;
    }

    /**
     * Get invoice by ID
     */
    async getInvoice(invoiceId: string): Promise<InvoiceDocument> {
        if (!Types.ObjectId.isValid(invoiceId)) {
            throw new BadRequestException('Invalid invoice ID');
        }

        const invoice = await this.invoiceModel.findById(invoiceId);
        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        return invoice;
    }

    /**
     * List invoices for a merchant, optionally filtered by status
     */
    async listInvoices(
        merchantId: string,
        status?: InvoiceStatus,
        limit = 50,
    ): Promise<InvoiceDocument[]> {
        const filter: any = { merchantId: new Types.ObjectId(merchantId) };
        if (status) {
            filter.status = status;
        }

        return this.invoiceModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }

    /**
     * Mark invoice as paid — called when a payment is confirmed for the linked payment link
     */
    async markAsPaid(
        paymentLinkId: string,
        paymentId: string,
    ): Promise<InvoiceDocument | null> {
        const invoice = await this.invoiceModel.findOne({
            paymentLinkId: new Types.ObjectId(paymentLinkId),
            status: { $ne: InvoiceStatus.PAID },
        });

        if (!invoice) {
            return null; // No invoice linked to this payment link, or already paid
        }

        invoice.status = InvoiceStatus.PAID;
        invoice.paymentId = new Types.ObjectId(paymentId);
        invoice.paidAt = new Date();

        const updated = await invoice.save();
        this.logger.log(
            `Invoice ${invoice.invoiceNumber} marked as PAID (payment: ${paymentId})`,
        );

        return updated;
    }

    /**
     * Cancel an invoice and deactivate its payment link
     */
    async cancelInvoice(
        invoiceId: string,
        merchantId: string,
    ): Promise<InvoiceDocument> {
        const invoice = await this.getInvoice(invoiceId);

        if (invoice.merchantId.toString() !== merchantId) {
            throw new BadRequestException('Not authorized to cancel this invoice');
        }

        if (invoice.status === InvoiceStatus.PAID) {
            throw new BadRequestException('Cannot cancel a paid invoice');
        }

        if (invoice.status === InvoiceStatus.CANCELLED) {
            throw new BadRequestException('Invoice is already cancelled');
        }

        // Deactivate the payment link
        if (invoice.paymentLinkId) {
            try {
                const paymentLink = await this.paymentLinksService.findById(
                    invoice.paymentLinkId.toString(),
                );
                if (paymentLink) {
                    await this.paymentLinksService.deactivateLink(
                        paymentLink.linkId,
                        merchantId,
                    );
                }
            } catch (err) {
                this.logger.warn(
                    `Failed to deactivate payment link for invoice ${invoiceId}: ${err.message}`,
                );
            }
        }

        invoice.status = InvoiceStatus.CANCELLED;
        const updated = await invoice.save();
        this.logger.log(`Invoice ${invoice.invoiceNumber} cancelled`);

        return updated;
    }

    /**
     * Find invoice by its payment link ID (used by payment auto-linking hook)
     */
    async findByPaymentLinkId(
        paymentLinkId: string,
    ): Promise<InvoiceDocument | null> {
        return this.invoiceModel.findOne({
            paymentLinkId: new Types.ObjectId(paymentLinkId),
        });
    }
}
