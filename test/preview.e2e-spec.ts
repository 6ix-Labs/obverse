import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { PreviewController } from '../src/preview/preview.controller';
import { PreviewService } from '../src/preview/preview.service';
import { PreviewSigningService } from '../src/preview/preview-signing.service';
import { PaymentLinksService } from '../src/payment-links/payment-links.service';
import { PreviewExceptionFilter } from '../src/preview/preview-exception.filter';
import { PreviewLoggingInterceptor } from '../src/preview/preview-logging.interceptor';

describe('Preview Endpoints (e2e)', () => {
  let app: INestApplication;

  const pngBuffer = Buffer.from('89504E470D0A1A0A', 'hex');

  let receiptVersion = 'pending';

  const previewServiceMock = {
    renderLinkPreview: jest.fn().mockResolvedValue({
      buffer: pngBuffer,
      statusCode: 200,
      etag: 'etag-link',
      cacheControl:
        'public, max-age=300, s-maxage=86400, stale-while-revalidate=600',
      renderMs: 4,
    }),
    renderReceiptPreview: jest.fn().mockImplementation(() =>
      Promise.resolve({
        buffer: pngBuffer,
        statusCode: 200,
        etag: `etag-receipt-${receiptVersion}`,
        lastModified: new Date('2026-02-17T10:00:00.000Z'),
        cacheControl:
          'public, max-age=300, s-maxage=86400, stale-while-revalidate=600',
        renderMs: 3,
      }),
    ),
    renderDashboardPreview: jest.fn().mockResolvedValue({
      buffer: pngBuffer,
      statusCode: 200,
      etag: 'etag-dashboard',
      cacheControl:
        'public, max-age=300, s-maxage=86400, stale-while-revalidate=600',
      renderMs: 5,
    }),
    renderNotFoundImage: jest.fn().mockResolvedValue({
      buffer: pngBuffer,
      statusCode: 404,
      etag: 'etag-not-found',
      cacheControl:
        'public, max-age=300, s-maxage=86400, stale-while-revalidate=600',
      renderMs: 2,
    }),
    renderFallbackImage: jest.fn().mockResolvedValue({
      buffer: pngBuffer,
      statusCode: 500,
      etag: 'etag-fallback',
      cacheControl:
        'public, max-age=300, s-maxage=86400, stale-while-revalidate=600',
      renderMs: 2,
    }),
  };

  const signingServiceMock = {
    requireDashboardSignature: jest.fn().mockReturnValue(true),
    getSignatureMaxTtlSeconds: jest.fn().mockReturnValue(900),
    verifyDashboardSignature: jest.fn().mockReturnValue(true),
  };

  const paymentLinksServiceMock = {
    findById: jest.fn().mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439012' },
      merchantId: { toString: () => '507f1f77bcf86cd799439011' },
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PreviewController],
      providers: [
        { provide: PreviewService, useValue: previewServiceMock },
        { provide: PreviewSigningService, useValue: signingServiceMock },
        { provide: PaymentLinksService, useValue: paymentLinksServiceMock },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: any) => {
              const values: Record<string, any> = {
                'preview.onErrorMode': 'fallback-image',
              };
              return values[key] ?? defaultValue;
            },
          },
        },
        PreviewExceptionFilter,
        PreviewLoggingInterceptor,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('link preview success (200, image/png)', async () => {
    await request
      .default(app.getHttpServer())
      .get('/preview/link/x7k9m2')
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect('Cache-Control', /max-age=300/)
      .expect('ETag', 'etag-link');
  });

  it('receipt preview success', async () => {
    await request
      .default(app.getHttpServer())
      .get('/preview/receipt/507f1f77bcf86cd799439013')
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect('ETag', /etag-receipt/)
      .expect('Last-Modified', /GMT/);
  });

  it('dashboard preview rejects missing signature', async () => {
    await request
      .default(app.getHttpServer())
      .get('/preview/dashboard/507f1f77bcf86cd799439012')
      .expect(500)
      .expect('Content-Type', /image\/png/);
  });

  it('dashboard preview rejects invalid signature', async () => {
    signingServiceMock.verifyDashboardSignature.mockReturnValueOnce(false);

    await request
      .default(app.getHttpServer())
      .get(
        `/preview/dashboard/507f1f77bcf86cd799439012?expires=${Math.floor(Date.now() / 1000) + 120}&signature=bad`,
      )
      .expect(500)
      .expect('Content-Type', /image\/png/);
  });

  it('dashboard preview accepts valid signature', async () => {
    signingServiceMock.verifyDashboardSignature.mockReturnValueOnce(true);

    await request
      .default(app.getHttpServer())
      .get(
        `/preview/dashboard/507f1f77bcf86cd799439012?expires=${Math.floor(Date.now() / 1000) + 120}&signature=valid`,
      )
      .expect(200)
      .expect('Content-Type', /image\/png/);
  });

  it('not-found returns branded fallback/not-found image', async () => {
    previewServiceMock.renderLinkPreview.mockResolvedValueOnce({
      buffer: pngBuffer,
      statusCode: 404,
      etag: 'etag-link-not-found',
      cacheControl:
        'public, max-age=300, s-maxage=86400, stale-while-revalidate=600',
      renderMs: 1,
      errorCode: 'DATA_NOT_FOUND',
    });

    await request
      .default(app.getHttpServer())
      .get('/preview/link/x7k9m2')
      .expect(404)
      .expect('Content-Type', /image\/png/);
  });

  it('ETag changes when receipt status changes', async () => {
    receiptVersion = 'pending';
    const pendingResponse = await request
      .default(app.getHttpServer())
      .get('/preview/receipt/507f1f77bcf86cd799439013')
      .expect(200);

    receiptVersion = 'confirmed';
    const confirmedResponse = await request
      .default(app.getHttpServer())
      .get('/preview/receipt/507f1f77bcf86cd799439013')
      .expect(200);

    expect(pendingResponse.headers.etag).not.toEqual(
      confirmedResponse.headers.etag,
    );
  });
});
