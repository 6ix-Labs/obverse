import { Controller, Post, Body, Ip, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { DashboardAuthService } from './dashboard-auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: DashboardAuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.validateCredentials(
      loginDto.identifier,
      loginDto.password,
      ip,
      userAgent,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // Client-side JWT removal is sufficient for logout
    // No server-side session to invalidate since we're using JWT
    return { message: 'Logged out successfully' };
  }
}
