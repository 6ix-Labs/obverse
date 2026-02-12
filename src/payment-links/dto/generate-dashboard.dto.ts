import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateDashboardDto {
  @ApiProperty({
    description: 'Payment link ID or linkCode to generate dashboard access for',
    example: 'x7k9m2',
  })
  @IsString()
  @IsNotEmpty()
  paymentLinkId: string;
}

export class DashboardCredentialsResponseDto {
  @ApiProperty({
    description: 'Dashboard URL',
    example: 'https://obverse.app/dashboard',
  })
  dashboardUrl: string;

  @ApiProperty({
    description: 'Login identifier (username or ID)',
    example: '@johndoe',
  })
  identifier: string;

  @ApiProperty({
    description: 'Temporary password (valid for 2 hours)',
    example: 'AbC123XyZ456',
  })
  temporaryPassword: string;

  @ApiProperty({
    description: 'Password expiration time',
    example: '2024-01-15T12:30:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Payment link code',
    example: 'x7k9m2',
  })
  linkCode: string;

  @ApiProperty({
    description: 'Payment link description',
    example: 'Product Sales Link',
  })
  description: string;

  @ApiProperty({
    description: 'Important security notice',
    example: 'Password expires in 2 hours. Do not share credentials.',
  })
  message: string;
}
