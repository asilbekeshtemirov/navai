import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {} 