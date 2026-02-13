import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';

/**
 * Optional API Key Guard
 *
 * - If X-API-Key header is provided: Validates it (throws error if invalid)
 * - If no X-API-Key header: Allows request through (for backward compatibility)
 *
 * This allows endpoints to support BOTH:
 * 1. Telegram bot users (no API key)
 * 2. External agents (with API key)
 */
@Injectable()
export class OptionalApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(OptionalApiKeyGuard.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract API key from X-API-Key header
    const apiKey = request.headers['x-api-key'];

    // If no API key provided, allow request (backward compatibility)
    if (!apiKey) {
      this.logger.debug(
        'No API key provided - allowing request (backward compatibility)',
      );
      return true;
    }

    // API key provided - validate it
    this.logger.debug('API key provided - validating...');

    const keyDoc = await this.apiKeysService.validateApiKey(apiKey);

    if (!keyDoc) {
      this.logger.warn(
        `Invalid API key attempted: ${apiKey.substring(0, 10)}...`,
      );
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    // Update last used timestamp (best effort)
    this.apiKeysService.touchApiKeyUsage(keyDoc._id).catch((err) => {
      this.logger.error(`Failed to update API key last used: ${err.message}`);
    });

    // Attach merchant info to request for use in controllers
    request.merchant = keyDoc.merchantId;
    request.apiKey = keyDoc;
    request.isApiKeyAuth = true; // Flag to indicate API key authentication

    this.logger.log(
      `API key authenticated: ${keyDoc.name} (Merchant: ${keyDoc.merchantId})`,
    );

    return true;
  }
}
