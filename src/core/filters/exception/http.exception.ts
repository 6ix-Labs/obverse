import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../../exceptions/base.exception';
import { DatabaseException } from '../../exceptions/database.exception';
import { BlockchainException } from '../../exceptions/blockchain.exception';
import { ValidationException } from '../../exceptions/validation.exception';
import { BusinessLogicException } from '../../exceptions/business-logic.exception';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response | any>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    let response_code: string;

    // defining response codes
    response_code =
      status == HttpStatus.NOT_FOUND
        ? (response_code = '004')
        : status == HttpStatus.BAD_REQUEST
          ? (response_code = '006')
          : status == HttpStatus.BAD_GATEWAY
            ? (response_code = '007')
            : status == HttpStatus.FORBIDDEN
              ? (response_code = '009')
              : status == HttpStatus.GATEWAY_TIMEOUT
                ? (response_code = '008')
                : status == HttpStatus.HTTP_VERSION_NOT_SUPPORTED
                  ? (response_code = '010')
                  : status == HttpStatus.NOT_ACCEPTABLE
                    ? (response_code = '016')
                    : status == HttpStatus.REQUEST_TIMEOUT
                      ? (response_code = '013')
                      : status == HttpStatus.UNAUTHORIZED
                        ? (response_code = '011')
                        : status == HttpStatus.UNPROCESSABLE_ENTITY
                          ? (response_code = '012')
                          : status == HttpStatus.UNSUPPORTED_MEDIA_TYPE
                            ? (response_code = '015')
                            : status == HttpStatus.URI_TOO_LONG
                              ? (response_code = '014')
                              : status == HttpStatus.SERVICE_UNAVAILABLE
                                ? (response_code = '016')
                                : status == HttpStatus.NOT_MODIFIED
                                  ? (response_code = '017')
                                  : status == HttpStatus.NOT_IMPLEMENTED
                                    ? (response_code = '018')
                                    : status == HttpStatus.INTERNAL_SERVER_ERROR
                                      ? 'An error encountered'
                                      : 'Internal Server error';

    let message: any;
    if (exception instanceof BadRequestException) {
      const xx: any = exception.getResponse();
      if (xx.hasOwnProperty('message')) {
        message = xx?.message;
      }
    }

    if (exception instanceof BaseException) {
      response_code = exception.getStatusCode();
    }

    // Handle custom exceptions
    let additionalData: any = {};
    const exceptionResponse: any = exception.getResponse();

    if (exception instanceof DatabaseException) {
      response_code = 'DATABASE_ERROR';
      if (typeof exceptionResponse === 'object') {
        additionalData = { operation: exceptionResponse.operation };
      }
    } else if (exception instanceof BlockchainException) {
      response_code = 'BLOCKCHAIN_ERROR';
      if (typeof exceptionResponse === 'object') {
        additionalData = {
          chain: exceptionResponse.chain,
          txSignature: exceptionResponse.txSignature,
        };
      }
    } else if (exception instanceof ValidationException) {
      response_code = 'VALIDATION_ERROR';
      if (typeof exceptionResponse === 'object') {
        additionalData = { errors: exceptionResponse.errors };
      }
    } else if (exception instanceof BusinessLogicException) {
      if (typeof exceptionResponse === 'object') {
        response_code = exceptionResponse.statusCode || 'BUSINESS_LOGIC_ERROR';
      }
    }

    const errorResponse = {
      success: false,
      response_code: response_code,
      response_description: exception.message || 'An Error Occurred',
      message: message || exception.message || '',
      ...additionalData,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);

    // Log the error with appropriate level
    if (status >= 500) {
      this.logger.error(
        `Error ${status} in ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `Client error ${status} in ${request.method} ${request.url}: ${exception.message}`,
      );
    }
  }
}
