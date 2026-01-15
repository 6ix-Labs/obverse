import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(message: string = 'Validation failed', errors?: any) {
    super(
      {
        message,
        errors,
        statusCode: 'VALIDATION_ERROR',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
