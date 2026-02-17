import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class PreviewSigningService {
  constructor(private readonly configService: ConfigService) {}

  getDashboardSignature(
    path: string,
    expires: number,
    context?: string,
  ): string {
    const secret = this.getSecret();
    const canonical = this.getCanonicalString(path, expires, context);
    return createHmac('sha256', secret).update(canonical).digest('hex');
  }

  verifyDashboardSignature(
    path: string,
    expires: number,
    signature: string,
    context?: string,
  ): boolean {
    if (!signature) {
      return false;
    }
    const expected = this.getDashboardSignature(path, expires, context);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  getSignatureMaxTtlSeconds(): number {
    return this.configService.get<number>(
      'preview.signatureMaxTtlSeconds',
      900,
    );
  }

  requireDashboardSignature(): boolean {
    return this.configService.get<boolean>(
      'preview.dashboardRequireSignature',
      true,
    );
  }

  getCanonicalString(path: string, expires: number, context?: string): string {
    return `${path}|${expires}${context ? `|${context}` : ''}`;
  }

  private getSecret(): string {
    return this.configService.get<string>(
      'preview.signingSecret',
      'preview-secret',
    );
  }
}
