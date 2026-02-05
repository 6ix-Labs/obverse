import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Telegram username or Telegram ID',
    example: '@johndoe',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string; // Telegram username or telegramId

  @ApiProperty({
    description: 'Temporary password for dashboard access',
    example: 'tempPass123',
  })
  @IsString()
  @IsNotEmpty()
  password: string; // Temporary password
}
