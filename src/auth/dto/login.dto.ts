import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Telegram username or telegramId

  @IsString()
  @IsNotEmpty()
  password: string; // Temporary password
}
