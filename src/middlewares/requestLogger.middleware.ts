import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = res.locals.requestId;
    const startTime = Date.now();

    // Log request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      ip: req.ip,
    });

    // Override end method to log response
    const originalEnd = res.end;
    res.end = function (chunk: any, encoding?: any, callback?: any) {
      const duration = Date.now() - startTime;
      
      logger.info('Outgoing response', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        response: chunk ? chunk.toString() : '',
      });

      // Call the original end method with proper arguments
      if (typeof encoding === 'function') {
        return originalEnd.call(this, chunk, encoding);
      } else if (typeof callback === 'function') {
        return originalEnd.call(this, chunk, encoding, callback);
      } else {
        return originalEnd.call(this, chunk, encoding);
      }
    };

    next();
  }
}