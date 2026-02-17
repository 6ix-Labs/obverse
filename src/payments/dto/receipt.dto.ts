import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentReceiptDto {
  @ApiProperty({
    description: 'Unique receipt identifier',
    example: '507f1f77bcf86cd799439013',
  })
  receiptId: string;

  @ApiProperty({
    description: 'Payment identifier',
    example: '507f1f77bcf86cd799439013',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Payment link code',
    example: 'x7k9m2',
  })
  linkCode: string;

  @ApiProperty({
    description: 'Blockchain transaction hash/signature',
    example: '5j7s8h3k9m2nwq4r6t8v1x3z5a7c9e2g4i6k8m0p2r4t6v8x0z2',
  })
  txSignature: string;

  @ApiProperty({
    description: 'Amount paid',
    example: 50,
  })
  amount: number;

  @ApiProperty({
    description: 'Token symbol',
    example: 'USDC',
  })
  token: string;

  @ApiProperty({
    description: 'Payment chain',
    example: 'monad',
  })
  chain: string;

  @ApiProperty({
    description: 'Payer wallet address',
    example: '0xA1b2C3d4e5F60718293aBcD4e5f60718293ABcD4',
  })
  fromAddress: string;

  @ApiProperty({
    description: 'Recipient wallet address',
    example: '0xD4c3B2a19087654321fEdCbA9876543210FEDCBA',
  })
  toAddress: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'confirmed',
  })
  status: string;

  @ApiProperty({
    description: 'Whether payment is confirmed',
    example: true,
  })
  isConfirmed: boolean;

  @ApiPropertyOptional({
    description: 'Payment confirmation timestamp',
    example: '2026-02-13T18:22:10.000Z',
  })
  confirmedAt?: Date;

  @ApiPropertyOptional({
    description: 'Payment creation timestamp',
    example: '2026-02-13T18:20:15.000Z',
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Dashboard URL',
    example: 'https://www.obverse.cc/dashboard',
  })
  dashboardUrl: string;

  @ApiProperty({
    description: 'Blockchain explorer URL for the transaction',
    example: 'https://monadscan.com/tx/0xabc123...',
  })
  explorerUrl: string;

  @ApiPropertyOptional({
    description: 'Collected customer data associated with this payment',
    example: { email: 'alice@example.com' },
  })
  customerData?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Preview image URL for social sharing',
    example: 'https://api.obverse.cc/preview/receipt/507f1f77bcf86cd799439013',
  })
  previewImageUrl?: string;
}
