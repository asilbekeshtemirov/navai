import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';
import { DbService } from '../../config/db.service';
import { RedisService } from '../../config/redis.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly dbService: DbService,
    private readonly redisService: RedisService,
  ) {}

  @Get('healthz')
  @ApiOperation({ summary: 'Liveness probe' })
  healthz(@Res() res: Response) {
    const requestId = uuidv4();
    res.locals.requestId = requestId;
    
    logger.info('Health check requested', { requestId });
    ApiResponse.success(res, { status: 'ok' });
  }

  @Get('ping')
  @ApiOperation({ summary: 'Dependency health (DB/Redis)' })
  async ping(@Res() res: Response) {
    const requestId = uuidv4();
    res.locals.requestId = requestId;
    
    logger.info('Ping check requested', { requestId });

    // Check database health
    const dbHealth = await this.dbService.healthCheck();
    
    // Check Redis health
    const redisHealth = await this.redisService.healthCheck();

    const dbOk = typeof dbHealth === 'boolean' ? dbHealth : !!dbHealth?.status;
    const redisOk = typeof redisHealth === 'boolean' ? redisHealth : !!redisHealth?.status;

    const responseData = {
      db: dbOk,
      redis: redisOk,
    };

    const isProduction = process.env.NODE_ENV === 'production';
    const allServicesHealthy = dbOk && redisOk;
    const statusCode = isProduction && !allServicesHealthy ? 503 : 200;
    
    if (statusCode === 503) {
      ApiResponse.error(res, 'Service dependencies unavailable', 503, 'One or more dependencies are down', responseData);
    } else {
      ApiResponse.success(res, responseData);
    }
  }
}