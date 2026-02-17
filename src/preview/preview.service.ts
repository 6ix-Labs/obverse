import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PreviewDataService } from './preview-data.service';
import { PreviewTemplateService } from './preview-template.service';
import { PreviewImageAdapter } from './adapters/preview-image.adapter';
import {
  DashboardPreviewData,
  LinkPreviewData,
  PreviewErrorCode,
  PreviewRenderResult,
  ReceiptPreviewData,
} from './types/preview.types';
import { PreviewError } from './types/preview.errors';
import {
  computePreviewEtag,
  computeReceiptPreviewVersion,
} from '../common/utils/preview-cache.util';

@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);
  private readonly width = 1200;
  private readonly height = 630;

  constructor(
    private readonly dataService: PreviewDataService,
    private readonly templateService: PreviewTemplateService,
    private readonly imageAdapter: PreviewImageAdapter,
    private readonly configService: ConfigService,
  ) {}

  async renderLinkPreview(linkCode: string): Promise<PreviewRenderResult> {
    const start = Date.now();
    try {
      const data = await this.dataService.getLinkPreviewData(linkCode);
      const svg = this.templateService.renderLinkSvg(data);
      return await this.renderFromSvg(svg, data.updatedAt, start, 'link');
    } catch (error) {
      return this.handleError('link', error, start);
    }
  }

  async renderReceiptPreview(paymentId: string): Promise<PreviewRenderResult> {
    const start = Date.now();
    try {
      const data = await this.dataService.getReceiptPreviewData(paymentId);
      const svg = this.templateService.renderReceiptSvg(data);
      const lastModified = data.updatedAt || data.confirmedAt || data.createdAt;
      const version = computeReceiptPreviewVersion({
        status: data.status,
        updatedAt: data.updatedAt,
        confirmedAt: data.confirmedAt,
        createdAt: data.createdAt,
      });
      return await this.renderFromSvg(
        svg,
        lastModified,
        start,
        `receipt:${paymentId}:${version}`,
      );
    } catch (error) {
      return this.handleError('receipt', error, start);
    }
  }

  async renderDashboardPreview(
    dashboardId: string,
    dateRange?: { start?: Date; end?: Date },
  ): Promise<PreviewRenderResult> {
    const start = Date.now();
    try {
      const data = await this.dataService.getDashboardPreviewData(
        dashboardId,
        dateRange,
      );
      const svg = this.templateService.renderDashboardSvg(data);
      return await this.renderFromSvg(svg, data.updatedAt, start, 'dashboard');
    } catch (error) {
      return this.handleError('dashboard', error, start);
    }
  }

  async renderNotFoundImage(): Promise<PreviewRenderResult> {
    const start = Date.now();
    const svg = this.templateService.renderNotFoundSvg();
    return this.renderFromSvg(svg, undefined, start, 'not-found', 404);
  }

  async renderFallbackImage(): Promise<PreviewRenderResult> {
    const start = Date.now();
    const svg = this.templateService.renderFallbackSvg();
    return this.renderFromSvg(svg, undefined, start, 'fallback', 500);
  }

  getCacheControlHeader(): string {
    const maxAge = this.configService.get<number>(
      'preview.cachePublicMaxAge',
      300,
    );
    const sMaxAge = this.configService.get<number>(
      'preview.cacheSMaxAge',
      86400,
    );
    return `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=600`;
  }

  private async renderFromSvg(
    svg: string,
    lastModified: Date | undefined,
    startMs: number,
    etagSeed: string,
    statusCode = 200,
  ): Promise<PreviewRenderResult> {
    const timeoutMs = this.configService.get<number>(
      'preview.renderTimeoutMs',
      3000,
    );
    const buffer = await this.imageAdapter.renderSvgToPng(
      svg,
      this.width,
      this.height,
      timeoutMs,
    );

    return {
      buffer,
      statusCode,
      etag: computePreviewEtag(etagSeed + svg),
      lastModified,
      cacheControl: this.getCacheControlHeader(),
      renderMs: Date.now() - startMs,
    };
  }

  private async handleError(
    previewType: string,
    error: any,
    startMs: number,
  ): Promise<PreviewRenderResult> {
    const errorCode = this.mapErrorCode(error);
    this.logger.warn(
      `Preview render error for ${previewType}: ${errorCode} - ${error?.message}`,
    );

    try {
      const svg =
        errorCode === 'DATA_NOT_FOUND'
          ? this.templateService.renderNotFoundSvg()
          : this.templateService.renderFallbackSvg();
      const statusCode = errorCode === 'DATA_NOT_FOUND' ? 404 : 500;
      const result = await this.renderFromSvg(
        svg,
        undefined,
        startMs,
        `${previewType}:${errorCode}`,
        statusCode,
      );
      return { ...result, errorCode };
    } catch (renderError) {
      this.logger.error(
        `Failed to render fallback preview: ${renderError?.message}`,
      );
      throw new PreviewError('RENDER_FAILED', 'Failed to render preview');
    }
  }

  private mapErrorCode(error: any): PreviewErrorCode {
    if (!error) {
      return 'RENDER_FAILED';
    }
    if (error?.code) {
      return error.code as PreviewErrorCode;
    }
    if (error?.name === 'NotFoundException') {
      return 'DATA_NOT_FOUND';
    }
    return 'RENDER_FAILED';
  }
}
