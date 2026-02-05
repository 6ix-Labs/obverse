import { HttpException, HttpStatus } from '@nestjs/common';

export class DatabaseException extends HttpException {
  constructor(
    message: string = 'Database operation failed',
    operation?: string,
  ) {
    super(
      {
        message,
        operation,
        statusCode: 'DATABASE_ERROR',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
