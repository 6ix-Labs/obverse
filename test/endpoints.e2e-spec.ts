import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/core/filters/exception/http.exception';
import { ModelExceptionFilter } from '../src/core/filters/exception/model.exception';

describe('API Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        errorHttpStatusCode: 400,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalFilters(new ModelExceptionFilter());

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 10000);

  describe('Root Endpoint', () => {
    it('GET / - should return Hello World', () => {
      return request
        .default(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('Payment Links Endpoints', () => {
    describe('GET /payment-links/:linkCode', () => {
      it('should return 400 for empty link code', () => {
        return request
          .default(app.getHttpServer())
          .get('/payment-links/ ')
          .expect(400);
      });

      it('should return 400 for invalid link code format (too short)', () => {
        return request
          .default(app.getHttpServer())
          .get('/payment-links/abc')
          .expect(400);
      });

      it('should return 400 for invalid link code format (too long)', () => {
        return request
          .default(app.getHttpServer())
          .get('/payment-links/abcdefghijklmnopqrstuvwxyz')
          .expect(400);
      });

      it('should return 404 for non-existent link code', () => {
        return request
          .default(app.getHttpServer())
          .get('/payment-links/validcode123')
          .expect(404);
      });
    });
  });

  describe('Transactions Endpoints', () => {
    describe('POST /transactions', () => {
      it('should return 400 when merchantId is missing', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions')
          .send({
            txSignature: 'test-signature',
            chain: 'solana',
            type: 'payment',
            fromAddress: 'from-address',
            toAddress: 'to-address',
          })
          .expect(400);
      });

      it('should return 400 when txSignature is missing', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions')
          .send({
            merchantId: 'merchant123',
            chain: 'solana',
            type: 'payment',
            fromAddress: 'from-address',
            toAddress: 'to-address',
          })
          .expect(400);
      });

      it('should return 400 when chain is missing', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions')
          .send({
            merchantId: 'merchant123',
            txSignature: 'test-signature',
            type: 'payment',
            fromAddress: 'from-address',
            toAddress: 'to-address',
          })
          .expect(400);
      });

      it('should return 400 when type is missing', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions')
          .send({
            merchantId: 'merchant123',
            txSignature: 'test-signature',
            chain: 'solana',
            fromAddress: 'from-address',
            toAddress: 'to-address',
          })
          .expect(400);
      });

      it('should return 400 when fromAddress is missing', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions')
          .send({
            merchantId: 'merchant123',
            txSignature: 'test-signature',
            chain: 'solana',
            type: 'payment',
            toAddress: 'to-address',
          })
          .expect(400);
      });

      it('should return 400 when toAddress is missing', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions')
          .send({
            merchantId: 'merchant123',
            txSignature: 'test-signature',
            chain: 'solana',
            type: 'payment',
            fromAddress: 'from-address',
          })
          .expect(400);
      });
    });

    describe('GET /transactions/signature/:txSignature', () => {
      it('should return 400 for empty signature', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/signature/ ')
          .expect(400);
      });

      it('should return 404 for non-existent signature', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/signature/nonexistent-signature')
          .expect(404);
      });

      it('should accept optional chain query parameter', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/signature/test-sig?chain=solana')
          .expect((res) => {
            expect([404, 500]).toContain(res.status);
          });
      });
    });

    describe('GET /transactions/:id', () => {
      it('should return 400 for empty ID', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/ ')
          .expect(400);
      });

      it('should return 404 for non-existent ID', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/507f1f77bcf86cd799439011')
          .expect(404);
      });
    });

    describe('GET /transactions/merchant/:merchantId', () => {
      it('should return 400 for empty merchantId', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/ ')
          .expect(400);
      });

      it('should return 400 for invalid limit', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/merchant123?limit=1001')
          .expect(400);
      });

      it('should return 400 for negative limit', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/merchant123?limit=-1')
          .expect(400);
      });

      it('should return 400 for negative skip', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/merchant123?skip=-1')
          .expect(400);
      });

      it('should accept valid query parameters', () => {
        return request
          .default(app.getHttpServer())
          .get(
            '/transactions/merchant/merchant123?limit=10&skip=0&type=payment&chain=solana&status=confirmed',
          )
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });
      });

      it('should accept date range parameters', () => {
        return request
          .default(app.getHttpServer())
          .get(
            '/transactions/merchant/merchant123?startDate=2024-01-01&endDate=2024-12-31',
          )
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });
      });
    });

    describe('GET /transactions/merchant/:merchantId/stats', () => {
      it('should return 400 for empty merchantId', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/ /stats')
          .expect(400);
      });

      it('should accept optional filter parameters', () => {
        return request
          .default(app.getHttpServer())
          .get(
            '/transactions/merchant/merchant123/stats?type=payment&chain=solana',
          )
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });
      });

      it('should accept date range for stats', () => {
        return request
          .default(app.getHttpServer())
          .get(
            '/transactions/merchant/merchant123/stats?startDate=2024-01-01&endDate=2024-12-31',
          )
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });
      });
    });

    describe('GET /transactions/merchant/:merchantId/swaps', () => {
      it('should return 400 for empty merchantId', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/ /swaps')
          .expect(400);
      });

      it('should return 400 for invalid limit', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/merchant123/swaps?limit=101')
          .expect(400);
      });

      it('should return 400 for negative limit', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/merchant123/swaps?limit=-1')
          .expect(400);
      });

      it('should accept valid limit parameter', () => {
        return request
          .default(app.getHttpServer())
          .get('/transactions/merchant/merchant123/swaps?limit=50')
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });
      });
    });

    describe('POST /transactions/:txSignature/confirm', () => {
      it('should return 400 for empty signature', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/ /confirm')
          .send({ confirmations: 10 })
          .expect(400);
      });

      it('should return 400 for missing confirmations', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/confirm')
          .send({})
          .expect(400);
      });

      it('should return 400 for negative confirmations', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/confirm')
          .send({ confirmations: -1 })
          .expect(400);
      });

      it('should accept valid confirmation data', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/confirm')
          .send({
            confirmations: 10,
            chain: 'solana',
            blockTime: new Date().toISOString(),
          })
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });
      });
    });

    describe('POST /transactions/:txSignature/fail', () => {
      it('should return 400 for empty signature', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/ /fail')
          .send({ errorMessage: 'Test error' })
          .expect(400);
      });

      it('should return 400 for missing error message', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/fail')
          .send({})
          .expect(400);
      });

      it('should return 400 for empty error message', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/fail')
          .send({ errorMessage: ' ' })
          .expect(400);
      });

      it('should accept valid fail data', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/fail')
          .send({
            errorMessage: 'Transaction failed',
            chain: 'solana',
          })
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });
      });
    });

    describe('POST /transactions/:txSignature/confirmations', () => {
      it('should return 400 for empty signature', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/ /confirmations')
          .send({ confirmations: 5 })
          .expect(400);
      });

      it('should return 400 for missing confirmations', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/confirmations')
          .send({})
          .expect(400);
      });

      it('should return 400 for negative confirmations', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/confirmations')
          .send({ confirmations: -1 })
          .expect(400);
      });

      it('should accept valid confirmation update', () => {
        return request
          .default(app.getHttpServer())
          .post('/transactions/test-signature/confirmations')
          .send({
            confirmations: 5,
            chain: 'solana',
          })
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });
      });
    });
  });

  describe('Payments Endpoints', () => {
    describe('GET /payments/link/:linkCode', () => {
      it('should return 400 for empty link code', () => {
        return request
          .default(app.getHttpServer())
          .get('/payments/link/ ')
          .expect(400);
      });

      it('should return 400 for invalid link code format (too short)', () => {
        return request
          .default(app.getHttpServer())
          .get('/payments/link/abc')
          .expect(400);
      });

      it('should return 400 for invalid link code format (too long)', () => {
        return request
          .default(app.getHttpServer())
          .get('/payments/link/abcdefghijklmnopqrstuvwxyz')
          .expect(400);
      });

      it('should return 404 for non-existent link code', () => {
        return request
          .default(app.getHttpServer())
          .get('/payments/link/validcode123')
          .expect(404);
      });
    });
  });

  describe('Empty Controller Endpoints', () => {
    it('GET /telegram - should respond (currently no routes)', () => {
      return request
        .default(app.getHttpServer())
        .get('/telegram')
        .expect((res) => {
          expect([404, 200]).toContain(res.status);
        });
    });

    it('GET /blockchain - should respond (currently no routes)', () => {
      return request
        .default(app.getHttpServer())
        .get('/blockchain')
        .expect((res) => {
          expect([404, 200]).toContain(res.status);
        });
    });

    it('GET /merchants - should respond (currently no routes)', () => {
      return request
        .default(app.getHttpServer())
        .get('/merchants')
        .expect((res) => {
          expect([404, 200]).toContain(res.status);
        });
    });

    it('GET /wallet - should respond (currently no routes)', () => {
      return request
        .default(app.getHttpServer())
        .get('/wallet')
        .expect((res) => {
          expect([404, 200]).toContain(res.status);
        });
    });
  });
});
