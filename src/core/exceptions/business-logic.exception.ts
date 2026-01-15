import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessLogicException extends HttpException {
  constructor(message: string, statusCode: string = 'BUSINESS_LOGIC_ERROR') {
    super(
      {
        message,
        statusCode,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
