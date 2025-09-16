import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { DbService } from './db.service';
import { RedisService } from './redis.service';

@Module({
  providers: [ConfigService, DbService, RedisService],
  exports: [ConfigService, DbService, RedisService],
})
export class ConfigModule {}