import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    BadRequestException,
    Logger,
    NotFoundException,
    Headers,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiHeader,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from './schemas/invoice.schema';
import { MerchantService } from '../merchants/merchants.service';
import { ApiKeysService } from '../api-keys/api-keys.service';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
    private readonly logger = new Logger(InvoicesController.name);

    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly merchantsService: MerchantService,
        private readonly apiKeysService: ApiKeysService,
    ) { }

    /**
     * Resolve merchantId from API key header
     */
    private async getMerchantIdFromApiKey(apiKey: string): Promise<string> {
        if (!apiKey) {
            throw new BadRequestException('X-API-Key header is required');
        }

        const keyDoc = await this.apiKeysService.validateApiKey(apiKey);
        if (!keyDoc) {
            throw new BadRequestException('Invalid API key');
        }

        // Handle populated merchantId (object with _id) vs plain ObjectId
        const mid = keyDoc.merchantId;
        if (typeof mid === 'object' && mid._id) {
            return mid._id.toString();
        }
        return mid.toString();
    }

    /**
     * Create a new invoice
     * POST /invoices
     */
    @Post()
    @ApiOperation({
        summary: 'Create an invoice',
        description:
            'Create an invoice with line items. A one-time payment link is auto-generated.',
    })
    @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: true })
    @ApiResponse({ status: 201, description: 'Invoice created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async createInvoice(
        @Headers('x-api-key') apiKey: string,
        @Body() dto: CreateInvoiceDto,
    ) {
        const merchantId = await this.getMerchantIdFromApiKey(apiKey);
        dto.merchantId = merchantId;

        const invoice = await this.invoicesService.createInvoice(dto);

        return {
            success: true,
            invoice: {
                id: invoice._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
                recipientEmail: invoice.recipientEmail,
                recipientName: invoice.recipientName,
                lineItems: invoice.lineItems,
                subtotal: invoice.subtotal,
                total: invoice.total,
                token: invoice.token,
                chain: invoice.chain,
                status: invoice.status,
                dueDate: invoice.dueDate,
                paymentUrl: invoice.paymentUrl,
                notes: invoice.notes,
                createdAt: invoice.createdAt,
            },
        };
    }

    /**
     * Get invoice by ID
     * GET /invoices/:id
     */
    @Get(':id')
    @ApiOperation({
        summary: 'Get invoice details',
        description: 'Retrieve a specific invoice by its ID',
    })
    @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: true })
    @ApiParam({ name: 'id', description: 'Invoice ID' })
    @ApiResponse({ status: 200, description: 'Invoice details' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async getInvoice(
        @Headers('x-api-key') apiKey: string,
        @Param('id') id: string,
    ) {
        await this.getMerchantIdFromApiKey(apiKey);
        const invoice = await this.invoicesService.getInvoice(id);

        return { success: true, invoice };
    }

    /**
     * List invoices for the authenticated merchant
     * GET /invoices
     */
    @Get()
    @ApiOperation({
        summary: 'List invoices',
        description: 'List all invoices for the authenticated merchant, optionally filtered by status',
    })
    @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: true })
    @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of invoices' })
    async listInvoices(
        @Headers('x-api-key') apiKey: string,
        @Query('status') status?: InvoiceStatus,
        @Query('limit') limit?: number,
    ) {
        const merchantId = await this.getMerchantIdFromApiKey(apiKey);
        const invoices = await this.invoicesService.listInvoices(
            merchantId,
            status,
            limit || 50,
        );

        return {
            success: true,
            count: invoices.length,
            invoices: invoices.map((inv) => ({
                id: inv._id.toString(),
                invoiceNumber: inv.invoiceNumber,
                recipientEmail: inv.recipientEmail,
                recipientName: inv.recipientName,
                total: inv.total,
                token: inv.token,
                status: inv.status,
                dueDate: inv.dueDate,
                paidAt: inv.paidAt,
                paymentUrl: inv.paymentUrl,
                createdAt: inv.createdAt,
            })),
        };
    }

    /**
     * Cancel an invoice
     * PATCH /invoices/:id/cancel
     */
    @Patch(':id/cancel')
    @ApiOperation({
        summary: 'Cancel an invoice',
        description: 'Cancel an invoice and deactivate its payment link. Cannot cancel paid invoices.',
    })
    @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: true })
    @ApiParam({ name: 'id', description: 'Invoice ID' })
    @ApiResponse({ status: 200, description: 'Invoice cancelled' })
    @ApiResponse({ status: 400, description: 'Cannot cancel' })
    async cancelInvoice(
        @Headers('x-api-key') apiKey: string,
        @Param('id') id: string,
    ) {
        const merchantId = await this.getMerchantIdFromApiKey(apiKey);
        const invoice = await this.invoicesService.cancelInvoice(id, merchantId);

        return {
            success: true,
            message: `Invoice ${invoice.invoiceNumber} cancelled`,
            invoice: {
                id: invoice._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
            },
        };
    }
}
