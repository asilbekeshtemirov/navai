import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ApiKeyService } from '../apikeys/apikey.service';
import { InferenceService } from '../inference/inference.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/ws/tts',
})
export class TtsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(private readonly apiKeys: ApiKeyService, private readonly inference: InferenceService) {}

  async handleConnection(client: Socket) {
    const apiKey = client.handshake.auth?.apiKey || client.handshake.headers['x-api-key'];
    const valid = typeof apiKey === 'string' && await this.apiKeys.validateApiKey(apiKey as string);
    if (!valid) {
      client.emit('error', { code: 1008, message: 'Invalid API key' });
      client.disconnect(true);
      return;
    }
    client.emit('connected', { ok: true, namespace: 'tts' });
  }

  handleDisconnect(client: Socket) {
    // no-op
  }

  @SubscribeMessage('speak')
  async onSpeak(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const text = data?.text || '';
      for await (const evt of this.inference.ttsStream({ text })) {
        if (evt?.type === 'audio' && evt.frame) client.emit('audio', { frame: evt.frame, seq: 0 });
        if (evt?.type === 'done') client.emit('done', { reason: 'completed' });
      }
      client.emit('done', { reason: 'completed' });
    } catch (e: any) {
      client.emit('error', { message: e?.message || 'TTS failed' });
    }
  }
} 