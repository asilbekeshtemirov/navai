import { Module } from '@nestjs/common';
import { SttGateway } from './stt.gateway';
import { TtsGateway } from './tts.gateway';
import { ApiKeyModule } from '../apikeys/apikey.module';
import { ConfigModule } from '../../config/config.module';
import { RealtimeController } from './realtime.controller';
import { InferenceService } from '../inference/inference.service';

@Module({
  imports: [ApiKeyModule, ConfigModule],
  controllers: [RealtimeController],
  providers: [SttGateway, TtsGateway, InferenceService],
  exports: [],
})
export class RealtimeModule {} 