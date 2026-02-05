import {
  Controller,
  Post,
  Body,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { DashboardAuthService } from './dashboard-auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: DashboardAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login to dashboard',
    description:
      'Authenticate user with Telegram username or ID and temporary password to access payment link dashboard',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated. Returns JWT token and user info.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        merchantId: '507f1f77bcf86cd799439011',
        paymentLinkId: '507f1f77bcf86cd799439012',
        linkCode: 'x7k9m2',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
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
  @ApiOperation({
    summary: 'Logout from dashboard',
    description:
      'Logout endpoint. Client-side JWT removal is sufficient for logout as we use stateless JWT authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  async logout() {
    // Client-side JWT removal is sufficient for logout
    // No server-side session to invalidate since we're using JWT
    return { message: 'Logged out successfully' };
  }
}
