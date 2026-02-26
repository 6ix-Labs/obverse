import {
    Controller,
    Get,
    NotFoundException,
    Param,
    Req,
    Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { buildShareHtml } from './share-html.util';
import { ShareService } from './share.service';

@ApiTags('share')
@Controller('share')
export class ShareController {
    constructor(private readonly shareService: ShareService) { }

    @Get('payment/:linkCode')
    @ApiOperation({ summary: 'Crawler-friendly payment share page (HTML)' })
    @ApiParam({ name: 'linkCode', example: 'x7k9m2' })
    @ApiProduces('text/html')
    async getPaymentShare(
        @Param('linkCode') linkCode: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        await this.sendShareHtml(
            async () => this.shareService.getPaymentShareMeta(linkCode, req),
            this.shareService.getMissingShareMeta('payment', req),
            res,
        );
    }

    @Get('receipt/:paymentId')
    @ApiOperation({ summary: 'Crawler-friendly receipt share page (HTML)' })
    @ApiParam({ name: 'paymentId', example: '507f1f77bcf86cd799439013' })
    @ApiProduces('text/html')
    async getReceiptShare(
        @Param('paymentId') paymentId: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        await this.sendShareHtml(
            async () => this.shareService.getReceiptShareMeta(paymentId, req),
            this.shareService.getMissingShareMeta('receipt', req),
            res,
        );
    }

    @Get('dashboard/:dashboardId')
    @ApiOperation({ summary: 'Crawler-friendly dashboard share page (HTML)' })
    @ApiParam({
        name: 'dashboardId',
        example: '507f1f77bcf86cd799439012',
        description: 'Dashboard identifier (paymentLink _id)',
    })
    @ApiProduces('text/html')
    async getDashboardShare(
        @Param('dashboardId') dashboardId: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        await this.sendShareHtml(
            async () => this.shareService.getDashboardShareMeta(dashboardId, req),
            this.shareService.getMissingShareMeta('dashboard', req),
            res,
        );
    }

    private async sendShareHtml(
        resolver: () => Promise<{
            title: string;
            description: string;
            pageUrl: string;
            imageUrl: string;
            redirectUrl: string;
        }>,
        fallbackMeta: {
            title: string;
            description: string;
            pageUrl: string;
            imageUrl: string;
            redirectUrl: string;
        },
        res: Response,
    ): Promise<void> {
        try {
            const meta = await resolver();
            const html = buildShareHtml(meta);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=60');
            res.status(200).send(html);
        } catch (error) {
            if (error instanceof NotFoundException || error?.name === 'NotFoundException') {
                const html = buildShareHtml(fallbackMeta);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Cache-Control', 'public, max-age=60');
                res.status(404).send(html);
                return;
            }

            throw error;
        }
    }
}
