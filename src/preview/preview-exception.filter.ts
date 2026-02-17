import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { PreviewService } from './preview.service';

@Catch()
export class PreviewExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PreviewExceptionFilter.name);

  constructor(private readonly previewService: PreviewService) {}

  async catch(exception: any, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    this.logger.warn(
      `Preview exception handled: ${exception?.message || 'unknown'} (${status})`,
    );

    try {
      const result =
        status === 404
          ? await this.previewService.renderNotFoundImage()
          : await this.previewService.renderFallbackImage();

      response.setHeader('Content-Type', 'image/png');
      response.setHeader('Cache-Control', result.cacheControl);
      response.setHeader('ETag', result.etag);

      if (result.lastModified) {
        response.setHeader('Last-Modified', result.lastModified.toUTCString());
      }

      response.status(status).send(result.buffer);
    } catch (error) {
      response.status(status).send();
    }
  }
}
