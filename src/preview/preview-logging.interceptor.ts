import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class PreviewLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PreviewLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const response = http.getResponse();

    return next.handle().pipe(
      tap(() => {
        const previewContext = response.locals?.previewContext;
        if (!previewContext) {
          return;
        }
        this.logger.log(
          JSON.stringify({
            previewType: previewContext.previewType,
            resourceId: previewContext.resourceId,
            renderMs: previewContext.renderMs,
            cacheHit: previewContext.cacheHit,
            status: previewContext.status,
            errorCode: previewContext.errorCode,
          }),
        );
      }),
    );
  }
}
