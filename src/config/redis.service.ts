import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import logger from '../utils/logger';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isDevelopment = process.env.NODE_ENV !== 'production';

  async onModuleInit() {
    // In development mode, if REDIS_DISABLED is set to true, skip Redis initialization
    if (this.isDevelopment && process.env.REDIS_DISABLED === 'true') {
      logger.info('Redis disabled in development mode - skipping Redis connection');
      return;
    }

    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        autoResubscribe: true,
        autoResendUnfulfilledCommands: true,
        connectTimeout: 10000,
        retryStrategy: (times) => {
          this.reconnectAttempts = times;
          
          // In development, limit retries and reduce logging
          if (this.isDevelopment) {
            if (times >= this.maxReconnectAttempts) {
              logger.warn('Redis max reconnect attempts reached, will not retry further in development mode');
              return null; // Stop retrying
            }
          }
          
          // Exponential backoff with max 30 seconds
          return Math.min(times * 50, 30000);
        },
      });
      
      // Handle Redis events
      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
      });
      
      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.reconnectAttempts = 0;
      });
      
      this.client.on('error', (error) => {
        // Only log Redis errors periodically to avoid spam
        if (this.reconnectAttempts % 5 === 0 || this.reconnectAttempts < 5) {
          logger.warn('Redis connection error', { 
            error: error.message,
            attempt: this.reconnectAttempts
          });
        }
      });
      
      this.client.on('close', () => {
        logger.info('Redis connection closed');
      });
      
      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...', { attempt: this.reconnectAttempts });
      });
      
      // Attempt to connect
      await this.client.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Failed to connect to Redis (running in offline mode)', { 
        error: error.message,
        maxAttempts: this.maxReconnectAttempts
      });
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        // Gracefully close Redis connection
        await this.client.quit();
        logger.info('Redis disconnected successfully');
      } catch (error) {
        logger.warn('Error disconnecting from Redis', { error: error.message });
        
        // Force disconnect if quit fails
        try {
          await this.client.disconnect();
        } catch (forceError) {
          logger.warn('Error force disconnecting from Redis', { error: forceError.message });
        }
      }
    }
  }

  async healthCheck() {
    // If Redis is disabled in development, return false
    if (this.isDevelopment && process.env.REDIS_DISABLED === 'true') {
      return { status: false, reason: 'Redis disabled in development mode' };
    }
    
    try {
      if (!this.client) return { status: false, reason: 'Redis client not initialized' };
      await this.client.ping();
      return { status: true };
    } catch (error) {
      logger.error('Redis health check failed', { error: error.message });
      return { status: false, reason: error.message };
    }
  }

  getClient(): Redis | null {
    // If Redis is disabled in development, return null
    if (this.isDevelopment && process.env.REDIS_DISABLED === 'true') {
      return null;
    }
    return this.client || null;
  }
}