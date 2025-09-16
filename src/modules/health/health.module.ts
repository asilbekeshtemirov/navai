import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class HealthModule {}