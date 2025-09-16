import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DbService } from '../../config/db.service';
import logger from '../../utils/logger';
import { ChatMessageDto } from './chat.dto';
import { ChatMessage } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly db: DbService) {}

  handleConnection(client: Socket) {
    logger.info('Chat client connected', { clientId: client.id });
    client.emit('connected', { message: 'Connected to chat server' });
  }

  handleDisconnect(client: Socket) {
    logger.info('Chat client disconnected', { clientId: client.id });
  }

  @SubscribeMessage('message')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: ChatMessageDto) {
    logger.info('Chat message received', { clientId: client.id, payload });
    
    try {
      // Save message to database only if database is enabled
      let messageRecord: ChatMessage | null = null;
      if (this.db.isDatabaseEnabled()) {
        messageRecord = await this.db.chatMessage.create({
          data: {
            userId: (client as any).user?.id || 'anonymous',
            message: payload.message,
            response: 'Echo: ' + payload.message,
            type: payload.type || 'text',
            audioUrl: payload.audioUrl,
          },
        });
      }
      
      // Echo the message back to the client
      client.emit('message', {
        ...payload,
        id: messageRecord?.id || 'temp-id',
        timestamp: messageRecord?.createdAt || new Date(),
      });
      
      // Broadcast to all other clients
      client.broadcast.emit('message', {
        ...payload,
        id: messageRecord?.id || 'temp-id',
        timestamp: messageRecord?.createdAt || new Date(),
      });
    } catch (error) {
      logger.error('Failed to save chat message', { error: error.message });
      client.emit('error', { message: 'Failed to process message' });
    }
  }
}