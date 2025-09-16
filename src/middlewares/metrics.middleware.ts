import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import logger from '../utils/logger';

// Create metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const originalSend = res.send;

    // Override send method to capture response
    res.send = function (body) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds

      const method = req.method;
      const route = req.route?.path || req.originalUrl || req.url;
      const statusCode = res.statusCode.toString();

      // Record metrics
      httpRequestDurationMicroseconds.labels(method, route, statusCode).observe(duration);
      httpRequestTotal.labels(method, route, statusCode).inc();

      return originalSend.call(this, body);
    };

    next();
  }
}