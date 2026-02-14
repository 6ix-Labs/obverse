import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNumber,
    IsArray,
    IsOptional,
    IsEmail,
    ValidateNested,
    Min,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineItemDto {
    @ApiProperty({ description: 'Description of the item or service', example: 'React development' })
    @IsString()
    description: string;

    @ApiProperty({ description: 'Quantity', example: 2, default: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({ description: 'Unit price in token amount', example: 150 })
    @IsNumber()
    @Min(0)
    unitPrice: number;
}

export class CreateInvoiceDto {
    @ApiPropertyOptional({ description: 'Merchant ID (set automatically from API key)', example: '507f1f77bcf86cd799439011' })
    @IsOptional()
    @IsString()
    merchantId?: string;

    @ApiProperty({ description: 'Recipient email address', example: 'john@acme.com' })
    @IsEmail()
    recipientEmail: string;

    @ApiPropertyOptional({ description: 'Recipient name', example: 'John Smith' })
    @IsOptional()
    @IsString()
    recipientName?: string;

    @ApiProperty({
        description: 'Line items for the invoice',
        type: [LineItemDto],
        example: [{ description: 'React development', quantity: 2, unitPrice: 150 }],
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => LineItemDto)
    lineItems: LineItemDto[];

    @ApiPropertyOptional({ description: 'Token for payment', example: 'USDC', default: 'USDC' })
    @IsOptional()
    @IsString()
    token?: string;

    @ApiPropertyOptional({ description: 'Blockchain network', example: 'solana', default: 'solana' })
    @IsOptional()
    @IsString()
    chain?: string;

    @ApiProperty({ description: 'Number of days until due', example: 14 })
    @IsNumber()
    @Min(1)
    dueDays: number;

    @ApiPropertyOptional({ description: 'Optional notes or memo', example: 'Sprint 12 frontend work' })
    @IsOptional()
    @IsString()
    notes?: string;
}
