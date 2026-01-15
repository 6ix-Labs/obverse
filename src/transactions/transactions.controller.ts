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
import { TransactionsService } from './transactions.service';
import { TransactionStatus, TransactionType } from './schemas/transaction.schema';

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

      this.logger.log(`Creating transaction: ${createTransactionDto.txSignature}`);
      return await this.transactionsService.createTransaction(createTransactionDto);
    } catch (error) {
      this.logger.error(`Error creating transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get transaction by signature
   * GET /transactions/signature/:txSignature
   */
  @Get('signature/:txSignature')
  async getBySignature(
    @Param('txSignature') txSignature: string,
    @Query('chain') chain?: string,
  ) {
    try {
      if (!txSignature || txSignature.trim().length === 0) {
        throw new BadRequestException('Transaction signature is required');
      }

      return await this.transactionsService.findByTxSignature(txSignature, chain);
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
        throw new BadRequestException('Skip must be greater than or equal to 0');
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
  async confirmTransaction(
    @Param('txSignature') txSignature: string,
    @Body() confirmDto: {
      confirmations: number;
      chain?: string;
      blockTime?: string;
    },
  ) {
    try {
      if (!txSignature || txSignature.trim().length === 0) {
        throw new BadRequestException('Transaction signature is required');
      }

      if (confirmDto.confirmations === undefined || confirmDto.confirmations < 0) {
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
  async failTransaction(
    @Param('txSignature') txSignature: string,
    @Body() failDto: {
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
  async updateConfirmations(
    @Param('txSignature') txSignature: string,
    @Body() updateDto: {
      confirmations: number;
      chain?: string;
    },
  ) {
    try {
      if (!txSignature || txSignature.trim().length === 0) {
        throw new BadRequestException('Transaction signature is required');
      }

      if (updateDto.confirmations === undefined || updateDto.confirmations < 0) {
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
