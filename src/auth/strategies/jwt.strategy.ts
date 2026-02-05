import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schema/merchant.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(Merchant.name)
    private merchantModel: Model<MerchantDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    // Payload contains: sub (merchantId), telegramId, username, paymentLinkId, sessionId
    const merchant = await this.merchantModel.findById(payload.sub);

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException('Invalid or inactive merchant');
    }

    // Return user object that will be attached to request
    return {
      sub: payload.sub,
      merchantId: payload.sub,
      telegramId: payload.telegramId,
      username: payload.username,
      paymentLinkId: payload.paymentLinkId,
      sessionId: payload.sessionId,
    };
  }
}
