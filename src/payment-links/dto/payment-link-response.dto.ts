import { ApiProperty } from '@nestjs/swagger';

export class CustomFieldDto {
  @ApiProperty({
    description: 'Field name',
    example: 'email',
  })
  fieldName: string;

  @ApiProperty({
    description: 'Field type (text, email, tel, etc.)',
    example: 'email',
    default: 'text',
  })
  fieldType: string;

  @ApiProperty({
    description: 'Whether the field is required',
    example: true,
    default: true,
  })
  required: boolean;
}

export class PaymentLinkResponseDto {
  @ApiProperty({
    description: 'Payment link ID',
    example: '507f1f77bcf86cd799439012',
  })
  _id: string;

  @ApiProperty({
    description: 'Merchant ID',
    example: '507f1f77bcf86cd799439011',
  })
  merchantId: string;

  @ApiProperty({
    description: 'Unique short link code',
    example: 'x7k9m2',
  })
  linkId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 50,
  })
  amount: number;

  @ApiProperty({
    description: 'Token/currency',
    example: 'USDC',
  })
  token: string;

  @ApiProperty({
    description: 'Blockchain chain',
    example: 'solana',
    enum: ['solana', 'monad'],
  })
  chain: string;

  @ApiProperty({
    description: 'Recipient wallet address',
    example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    required: false,
  })
  recipientWalletAddress?: string;

  @ApiProperty({
    description: 'Payment description',
    example: 'Payment for consultation services',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Custom fields to collect from customer',
    type: [CustomFieldDto],
    required: false,
  })
  customFields?: CustomFieldDto[];

  @ApiProperty({
    description: 'Whether the link can be used multiple times',
    example: false,
    default: false,
  })
  isReusable: boolean;

  @ApiProperty({
    description: 'Link expiration date',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Whether the link is active',
    example: true,
    default: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Number of times the link has been paid',
    example: 0,
    default: 0,
  })
  paymentCount: number;

  @ApiProperty({
    description: 'Last payment date',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  lastPaidAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
