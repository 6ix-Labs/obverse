import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CustomFieldDto {
  @ApiProperty({
    description: 'Field name',
    example: 'email',
  })
  @IsString()
  fieldName: string;

  @ApiProperty({
    description: 'Field type (text, email, tel, textarea, etc.)',
    example: 'email',
    default: 'text',
  })
  @IsString()
  @IsOptional()
  fieldType?: string;

  @ApiProperty({
    description: 'Whether the field is required',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  required?: boolean;
}

export class CreatePaymentLinkDto {
  @ApiProperty({
    description: 'Payment amount',
    example: 50,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Token/currency (USDC, USDT, SOL, ETH, etc.)',
    example: 'USDC',
    default: 'USDC',
  })
  @IsString()
  @IsOptional()
  token?: string;

  @ApiProperty({
    description: 'Blockchain chain',
    enum: ['solana', 'monad'],
    example: 'monad',
    default: 'solana',
  })
  @IsString()
  @IsOptional()
  chain?: string;

  @ApiProperty({
    description: 'Payment description',
    example: 'Payment for consultation services',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description:
      'Custom fields to collect from customers (e.g., email, name, phone)',
    type: [CustomFieldDto],
    required: false,
    example: [
      { fieldName: 'email', fieldType: 'email', required: true },
      { fieldName: 'name', fieldType: 'text', required: true },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  @IsOptional()
  customFields?: CustomFieldDto[];

  @ApiProperty({
    description: 'Whether the link can be used multiple times',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isReusable?: boolean;

  @ApiProperty({
    description: 'Link expiration date (ISO 8601)',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  @IsString()
  @IsOptional()
  expiresAt?: string;

  @ApiProperty({
    description: 'Specific wallet address to receive funds (optional)',
    example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    required: false,
  })
  @IsString()
  @IsOptional()
  recipientWalletAddress?: string;
}
