import { HttpException, HttpStatus } from '@nestjs/common';

export class BlockchainException extends HttpException {
  constructor(
    message: string = 'Blockchain operation failed',
    chain?: string,
    txSignature?: string,
  ) {
    super(
      {
        message,
        chain,
        txSignature,
        statusCode: 'BLOCKCHAIN_ERROR',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
