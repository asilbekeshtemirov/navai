import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [],
  exports: [],
})
export class UploadsModule {}