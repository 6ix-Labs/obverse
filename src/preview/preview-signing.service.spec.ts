import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PreviewSigningService } from './preview-signing.service';

describe('PreviewSigningService', () => {
  let service: PreviewSigningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreviewSigningService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: any) => {
              const values: Record<string, any> = {
                'preview.signingSecret': 'test-secret',
                'preview.signatureMaxTtlSeconds': 900,
                'preview.dashboardRequireSignature': true,
              };
              return values[key] ?? defaultValue;
            },
          },
        },
      ],
    }).compile();

    service = module.get<PreviewSigningService>(PreviewSigningService);
  });

  it('should generate and verify valid signature', () => {
    const path = '/preview/dashboard/507f1f77bcf86cd799439012';
    const expires = Math.floor(Date.now() / 1000) + 300;
    const context = 'merchant-1';

    const signature = service.getDashboardSignature(path, expires, context);

    expect(
      service.verifyDashboardSignature(path, expires, signature, context),
    ).toBe(true);
  });

  it('should reject invalid signature', () => {
    const path = '/preview/dashboard/507f1f77bcf86cd799439012';
    const expires = Math.floor(Date.now() / 1000) + 300;

    expect(
      service.verifyDashboardSignature(path, expires, 'invalid-signature'),
    ).toBe(false);
  });
});
