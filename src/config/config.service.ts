import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class ConfigService {
  get(key: string): string {
    return process.env[key] || '';
  }

  getNumber(key: string): number {
    const value = process.env[key];
    return value ? parseInt(value, 10) : 0;
  }

  getBoolean(key: string): boolean {
    const value = process.env[key];
    return value === 'true';
  }

  get port(): number {
    return this.getNumber('PORT') || 3000;
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }

  get corsOrigin(): string | string[] {
    const origin = this.get('CORS_ORIGIN');
    if (origin === '*') return origin;
    return origin.split(',').map(o => o.trim());
  }

  get jwtAccessSecret(): string {
    return this.get('JWT_ACCESS_SECRET') || 'access_secret';
  }

  get jwtRefreshSecret(): string {
    return this.get('JWT_REFRESH_SECRET') || 'refresh_secret';
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get redisHost(): string {
    return this.get('REDIS_HOST') || 'localhost';
  }

  get redisPort(): number {
    return this.getNumber('REDIS_PORT') || 6379;
  }

  get redisPassword(): string {
    return this.get('REDIS_PASSWORD') || '';
  }
}