import { Injectable, NestMiddleware, ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import logger from '../utils/logger';

@Injectable()
export class ErrorHandlerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    next();
  }
}

@Injectable()
export class NotFoundMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    // If response not yet sent and route not handled, return JSON 404
    if (!res.headersSent) {
      return ApiResponse.notFound(res, 'Route not found');
    }
    next();
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = response.locals.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.stack || null;
    }

    // Log the error
    logger.error('Unhandled error occurred', {
      requestId,
      error: exception,
      method: request.method,
      url: request.url,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Send error response
    ApiResponse.error(response, message, status, error);
  }
}