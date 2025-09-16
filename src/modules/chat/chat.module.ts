import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}