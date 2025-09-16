import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

@Injectable()
export class DbService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private isDisabled = false;

  constructor() {
    // In development mode, if DB_DISABLED is set to true, don't configure database connection
    const isDbDisabled = process.env.DB_DISABLED === 'true';
    if (process.env.NODE_ENV !== 'production' && isDbDisabled) {
      super();
      this.isDisabled = true;
    } else {
      super({
        // Configure Prisma with connection retry options
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        // Remove the log configuration that was causing issues
      });
    }
  }

  async onModuleInit() {
    // In development mode, if DB_DISABLED is set to true, skip database initialization
    if (this.isDevelopment && this.isDisabled) {
      logger.info('Database disabled in development mode - skipping database connection');
      return;
    }

    try {
      await this.$connect();
      logger.info('Database connected successfully');
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.warn('Failed to connect to database (running in offline mode)', { 
        error: error.message,
        maxAttempts: this.maxReconnectAttempts
      });
    }
  }

  async onModuleDestroy() {
    // In development mode, if DB_DISABLED is set to true, skip database disconnection
    if (this.isDevelopment && this.isDisabled) {
      logger.info('Database disabled in development mode - skipping database disconnection');
      return;
    }

    try {
      await this.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.warn('Error disconnecting from database', { error: error.message });
    }
  }

  async healthCheck() {
    // If database is disabled in development, return appropriate status
    if (this.isDevelopment && this.isDisabled) {
      return { status: false, reason: 'Database disabled in development mode' };
    }

    try {
      await this.$queryRaw`SELECT 1`;
      return { status: true };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return { status: false, reason: error.message };
    }
  }

  isDatabaseEnabled(): boolean {
    // If database is disabled in development, return false
    if (this.isDevelopment && this.isDisabled) {
      return false;
    }
    return true;
  }
}