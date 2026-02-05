import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import {
  TransactionStatus,
  TransactionType,
} from './schemas/transaction.schema';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Create a new transaction record
   * POST /transactions
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a transaction',
    description: 'Create a new transaction record in the system',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['merchantId', 'txSignature', 'chain', 'type', 'fromAddress', 'toAddress'],
      properties: {
        merchantId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        txSignature: { type: 'string', example: '5j7s...9k2m' },
        chain: { type: 'string', example: 'solana' },
        type: { type: 'string', enum: ['payment', 'swap', 'transfer', 'withdrawal'], example: 'payment' },
        fromAddress: { type: 'string', example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
        toAddress: { type: 'string', example: '9yZXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
        amount: { type: 'number', example: 50 },
        token: { type: 'string', example: 'USDC' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  async createTransaction(@Body() createTransactionDto: any) {
    try {
      // Validate required fields
      if (!createTransactionDto.merchantId) {
        throw new BadRequestException('Merchant ID is required');
      }
      if (!createTransactionDto.txSignature) {
        throw new BadRequestException('Transaction signature is required');
      }
      if (!createTransactionDto.chain) {
        throw new BadRequestException('Chain is required');
      }
      if (!createTransactionDto.type) {
        throw new BadRequestException('Transaction type is required');
      }
      if (!createTransactionDto.fromAddress) {
        throw new BadRequestException('From address is required');
      }
      if (!createTransactionDto.toAddress) {
        throw new BadRequestException('To address is required');
      }

      this.logger.log(
        `Creating transaction: ${createTransactionDto.txSignature}`,
      );
      return await this.transactionsService.createTransaction(
        createTransactionDto,
      );
    } catch (error) {
      this.logger.error(
        `Error creating transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transaction by signature
   * GET /transactions/signature/:txSignature
   */
  @Get('signature/:txSignature')
  @ApiOperation({
    summary: 'Get transaction by signature',
    description: 'Retrieve a transaction by its blockchain signature/hash',
  })
  @ApiParam({
    name: 'txSignature',
    description: 'Transaction signature/hash',
    example: '5j7s...9k2m',
  })
  @ApiQuery({
    name: 'chain',
    required: false,
    description: 'Blockchain chain',
    example: 'solana',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transaction signature',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async getBySignature(
    @Param('txSignature') txSignature: string,
    @Query('chain') chain?: string,
  ) {
    try {
      if (!txSignature || txSignature.trim().length === 0) {
        throw new BadRequestException('Transaction signature is required');
      }

      return await this.transactionsService.findByTxSignature(
        txSignature,
        chain,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching transaction by signature ${txSignature}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transaction by ID
   * GET /transactions/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction by ID',
    description: 'Retrieve a transaction by its database ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transaction ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async getById(@Param('id') id: string) {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('Transaction ID is required');
      }

      return await this.transactionsService.findById(id);
    } catch (error) {
      this.logger.error(
        `Error fetching transaction by ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transactions for a merchant
   * GET /transactions/merchant/:merchantId
   */
  @Get('merchant/:merchantId')
  @ApiOperation({
    summary: 'Get merchant transactions',
    description: 'Retrieve all transactions for a specific merchant with optional filters',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'Merchant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results to return (max 1000)', example: 50 })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of results to skip', example: 0 })
  @ApiQuery({ name: 'type', required: false, enum: ['payment', 'swap', 'transfer', 'withdrawal'], description: 'Transaction type filter' })
  @ApiQuery({ name: 'chain', required: false, type: String, description: 'Blockchain chain filter', example: 'solana' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'confirmed', 'failed'], description: 'Transaction status filter' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date filter (ISO 8601)', example: '2024-01-01T00:00:00.000Z' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date filter (ISO 8601)', example: '2024-12-31T23:59:59.999Z' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    schema: {
      example: {
        transactions: [],
        total: 42,
        limit: 50,
        skip: 0,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  async getByMerchant(
    @Param('merchantId') merchantId: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('type') type?: string,
    @Query('chain') chain?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      if (!merchantId || merchantId.trim().length === 0) {
        throw new BadRequestException('Merchant ID is required');
      }

      if (limit && (limit < 0 || limit > 1000)) {
        throw new BadRequestException('Limit must be between 0 and 1000');
      }

      if (skip && skip < 0) {
        throw new BadRequestException(
          'Skip must be greater than or equal to 0',
        );
      }

      return await this.transactionsService.findByMerchantId(merchantId, {
        limit: limit ? Number(limit) : undefined,
        skip: skip ? Number(skip) : undefined,
        ...(type && { type: type as TransactionType }),
        chain,
        ...(status && { status: status as TransactionStatus }),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    } catch (error) {
      this.logger.error(
        `Error fetching transactions for merchant ${merchantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transaction statistics for a merchant
   * GET /transactions/merchant/:merchantId/stats
   */
  @Get('merchant/:merchantId/stats')
  @ApiOperation({
    summary: 'Get merchant transaction statistics',
    description: 'Retrieve aggregated statistics for a merchant\'s transactions',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'Merchant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['payment', 'swap', 'transfer', 'withdrawal'], description: 'Filter by transaction type' })
  @ApiQuery({ name: 'chain', required: false, type: String, description: 'Filter by blockchain chain', example: 'solana' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date filter (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date filter (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        totalTransactions: 150,
        totalVolume: 7500,
        byType: {
          payment: { count: 100, volume: 5000 },
          swap: { count: 50, volume: 2500 },
        },
        byChain: {
          solana: { count: 120, volume: 6000 },
          ethereum: { count: 30, volume: 1500 },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  async getStats(
    @Param('merchantId') merchantId: string,
    @Query('type') type?: string,
    @Query('chain') chain?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      if (!merchantId || merchantId.trim().length === 0) {
        throw new BadRequestException('Merchant ID is required');
      }

      return await this.transactionsService.getTransactionStats(merchantId, {
        ...(type && { type: type as TransactionType }),
        chain,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    } catch (error) {
      this.logger.error(
        `Error fetching stats for merchant ${merchantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get recent swaps for a merchant
   * GET /transactions/merchant/:merchantId/swaps
   */
  @Get('merchant/:merchantId/swaps')
  @ApiOperation({
    summary: 'Get recent swaps',
    description: 'Retrieve recent swap transactions for a merchant',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'Merchant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of swaps to return (max 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent swaps retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  async getRecentSwaps(
    @Param('merchantId') merchantId: string,
    @Query('limit') limit?: number,
  ) {
    try {
      if (!merchantId || merchantId.trim().length === 0) {
        throw new BadRequestException('Merchant ID is required');
      }

      if (limit && (limit < 0 || limit > 100)) {
        throw new BadRequestException('Limit must be between 0 and 100');
      }

      return await this.transactionsService.getRecentSwaps(
        merchantId,
        limit ? Number(limit) : undefined,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching swaps for merchant ${merchantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Confirm a transaction
   * POST /transactions/:txSignature/confirm
   */
  @Post(':txSignature/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm a transaction',
    description: 'Mark a transaction as confirmed with the specified number of confirmations',
  })
  @ApiParam({
    name: 'txSignature',
    description: 'Transaction signature/hash',
    example: '5j7s...9k2m',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['confirmations'],
      properties: {
        confirmations: { type: 'number', example: 32 },
        chain: { type: 'string', example: 'solana' },
        blockTime: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction confirmed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async confirmTransaction(
    @Param('txSignature') txSignature: string,
    @Body()
    confirmDto: {
      confirmations: number;
      chain?: string;
      blockTime?: string;
    },
  ) {
    try {
      if (!txSignature || txSignature.trim().length === 0) {
        throw new BadRequestException('Transaction signature is required');
      }

      if (
        confirmDto.confirmations === undefined ||
        confirmDto.confirmations < 0
      ) {
        throw new BadRequestException('Valid confirmations count is required');
      }

      this.logger.log(`Confirming transaction: ${txSignature}`);

      return await this.transactionsService.confirmTransaction(
        txSignature,
        confirmDto.confirmations,
        confirmDto.chain,
        confirmDto.blockTime ? new Date(confirmDto.blockTime) : undefined,
      );
    } catch (error) {
      this.logger.error(
        `Error confirming transaction ${txSignature}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark transaction as failed
   * POST /transactions/:txSignature/fail
   */
  @Post(':txSignature/fail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark transaction as failed',
    description: 'Mark a transaction as failed with an error message',
  })
  @ApiParam({
    name: 'txSignature',
    description: 'Transaction signature/hash',
    example: '5j7s...9k2m',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['errorMessage'],
      properties: {
        errorMessage: { type: 'string', example: 'Insufficient funds' },
        chain: { type: 'string', example: 'solana' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction marked as failed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async failTransaction(
    @Param('txSignature') txSignature: string,
    @Body()
    failDto: {
      errorMessage: string;
      chain?: string;
    },
  ) {
    try {
      if (!txSignature || txSignature.trim().length === 0) {
        throw new BadRequestException('Transaction signature is required');
      }

      if (!failDto.errorMessage || failDto.errorMessage.trim().length === 0) {
        throw new BadRequestException('Error message is required');
      }

      this.logger.log(`Marking transaction as failed: ${txSignature}`);

      return await this.transactionsService.failTransaction(
        txSignature,
        failDto.errorMessage,
        failDto.chain,
      );
    } catch (error) {
      this.logger.error(
        `Error marking transaction as failed ${txSignature}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update transaction confirmations
   * POST /transactions/:txSignature/confirmations
   */
  @Post(':txSignature/confirmations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update transaction confirmations',
    description: 'Update the number of confirmations for a transaction',
  })
  @ApiParam({
    name: 'txSignature',
    description: 'Transaction signature/hash',
    example: '5j7s...9k2m',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['confirmations'],
      properties: {
        confirmations: { type: 'number', example: 32 },
        chain: { type: 'string', example: 'solana' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction confirmations updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async updateConfirmations(
    @Param('txSignature') txSignature: string,
    @Body()
    updateDto: {
      confirmations: number;
      chain?: string;
    },
  ) {
    try {
      if (!txSignature || txSignature.trim().length === 0) {
        throw new BadRequestException('Transaction signature is required');
      }

      if (
        updateDto.confirmations === undefined ||
        updateDto.confirmations < 0
      ) {
        throw new BadRequestException('Valid confirmations count is required');
      }

      this.logger.log(`Updating confirmations for transaction: ${txSignature}`);

      return await this.transactionsService.updateConfirmations(
        txSignature,
        updateDto.confirmations,
        updateDto.chain,
      );
    } catch (error) {
      this.logger.error(
        `Error updating confirmations for transaction ${txSignature}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
