import {
    Controller,
    Get,
    Param,
    Query,
    Req,
    Res,
    UseFilters,
    UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import { PreviewService } from './preview.service';
import {
    DashboardPreviewParamsDto,
    LinkPreviewParamsDto,
    ReceiptPreviewParamsDto,
} from './dto/preview-params.dto';
import { DashboardPreviewQueryDto } from './dto/dashboard-preview-query.dto';
import { PreviewSigningService } from './preview-signing.service';
import { PreviewLoggingInterceptor } from './preview-logging.interceptor';
import { PreviewExceptionFilter } from './preview-exception.filter';
import { PaymentLinksService } from '../payment-links/payment-links.service';
import { PreviewErrorCode, PreviewRenderResult } from './types/preview.types';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

@ApiTags('preview')
@Controller('preview')
@UseInterceptors(PreviewLoggingInterceptor)
@UseFilters(PreviewExceptionFilter)
export class PreviewController {
    constructor(
        private readonly previewService: PreviewService,
        private readonly signingService: PreviewSigningService,
        private readonly paymentLinksService: PaymentLinksService,
        private readonly configService: ConfigService,
    ) { }

    @Get('link/:linkCode')
    @ApiOperation({ summary: 'Get payment link preview image' })
    @ApiParam({ name: 'linkCode', example: 'x7k9m2' })
    @ApiProduces('image/png')
    async getLinkPreview(
        @Param() params: LinkPreviewParamsDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const result = await this.previewService.renderLinkPreview(params.linkCode);
        this.sendResult(req, res, result, 'link', params.linkCode);
    }

    @Get('receipt/:paymentId')
    @ApiOperation({ summary: 'Get receipt preview image' })
    @ApiParam({ name: 'paymentId', example: '507f1f77bcf86cd799439013' })
    @ApiProduces('image/png')
    async getReceiptPreview(
        @Param() params: ReceiptPreviewParamsDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const result = await this.previewService.renderReceiptPreview(
            params.paymentId,
        );
        this.sendResult(req, res, result, 'receipt', params.paymentId);
    }

    @Get('dashboard/:dashboardId')
    @ApiOperation({ summary: 'Get dashboard summary preview image' })
    @ApiParam({ name: 'dashboardId', example: '507f1f77bcf86cd799439012' })
    @ApiProduces('image/png')
    async getDashboardPreview(
        @Param() params: DashboardPreviewParamsDto,
        @Query() query: DashboardPreviewQueryDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const requireSignature = this.signingService.requireDashboardSignature();
        const expires = query.expires;
        const signature = query.signature;

        if (requireSignature) {
            const link = await this.paymentLinksService.findById(params.dashboardId);
            const path = `/preview/dashboard/${params.dashboardId}`;
            const context = link.merchantId?.toString();
            const errorCode = this.validateSignature(
                path,
                expires,
                signature,
                context,
            );

            if (errorCode) {
                const onErrorMode = this.configService.get<string>(
                    'preview.onErrorMode',
                    'fallback-image',
                );

                if (onErrorMode === '403') {
                    res.status(403).send();
                    return;
                }

                const fallback = await this.previewService.renderFallbackImage();
                this.sendResult(
                    req,
                    res,
                    { ...fallback, errorCode },
                    'dashboard',
                    params.dashboardId,
                );
                return;
            }
        }

        const dateRange = this.parseDateRange(query.startDate, query.endDate);
        const result = await this.previewService.renderDashboardPreview(
            params.dashboardId,
            dateRange,
        );

        this.sendResult(req, res, result, 'dashboard', params.dashboardId);
    }

    private validateSignature(
        path: string,
        expires: number | undefined,
        signature: string | undefined,
        context?: string,
    ): PreviewErrorCode | null {
        if (!expires || !signature) {
            return 'SIGNATURE_MISSING';
        }

        const now = Math.floor(Date.now() / 1000);
        const maxTtl = this.signingService.getSignatureMaxTtlSeconds();

        if (expires < now) {
            return 'SIGNATURE_EXPIRED';
        }

        if (expires - now > maxTtl) {
            return 'SIGNATURE_TTL_EXCEEDED';
        }

        const valid = this.signingService.verifyDashboardSignature(
            path,
            expires,
            signature,
            context,
        );

        if (!valid) {
            return 'SIGNATURE_INVALID';
        }

        return null;
    }

    private parseDateRange(
        startDate?: string,
        endDate?: string,
    ): { start?: Date; end?: Date } | undefined {
        if (!startDate && !endDate) {
            return undefined;
        }

        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        return { start, end };
    }

    private sendResult(
        req: Request,
        res: Response,
        result: PreviewRenderResult,
        previewType: string,
        resourceId: string,
    ): void {
        const ifNoneMatch = req.get('if-none-match');
        const cacheHit = ifNoneMatch && ifNoneMatch === result.etag;

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', result.cacheControl);
        res.setHeader('ETag', result.etag);

        if (result.lastModified) {
            res.setHeader('Last-Modified', result.lastModified.toUTCString());
        }

        res.locals.previewContext = {
            previewType,
            resourceId,
            renderMs: result.renderMs,
            cacheHit: Boolean(cacheHit),
            status: cacheHit ? 304 : result.statusCode,
            errorCode: result.errorCode,
        };

        if (cacheHit) {
            res.status(304).send();
            return;
        }

        res.status(result.statusCode).send(result.buffer);
    }
}
