import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract API key from X-API-Key header
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      this.logger.warn('No API key provided in request');
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key using service (supports both hashed and plaintext)
    const keyDoc = await this.apiKeysService.validateApiKey(apiKey);

    if (!keyDoc) {
      this.logger.warn(
        `Invalid API key attempted: ${apiKey.substring(0, 10)}...`,
      );
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    // Attach merchant info to request for use in controllers
    request.merchant = keyDoc.merchantId;
    request.apiKey = keyDoc;

    // Track key usage (best effort)
    this.apiKeysService.touchApiKeyUsage(keyDoc._id).catch((err) => {
      this.logger.error(`Failed to update API key last used: ${err.message}`);
    });

    this.logger.log(
      `API key authenticated: ${keyDoc.name} (Merchant: ${keyDoc.merchantId})`,
    );

    return true;
  }
}
