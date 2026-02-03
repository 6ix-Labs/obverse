import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { DashboardAuthService } from './dashboard-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DashboardSession, DashboardSessionSchema } from './schemas/dashboard-session.schema';
import { Merchant, MerchantSchema } from '../merchants/schema/merchant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DashboardSession.name, schema: DashboardSessionSchema },
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        signOptions: {
          expiresIn: '2h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [DashboardAuthService, JwtStrategy],
  exports: [DashboardAuthService, JwtModule, PassportModule],
})
export class AuthModule {}
