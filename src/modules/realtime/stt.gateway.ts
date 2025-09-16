import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ApiKeyService } from '../apikeys/apikey.service';
import { InferenceService } from '../inference/inference.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/ws/stt',
})
export class SttGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private clientBuffers: Map<string, string[]> = new Map();
  constructor(private readonly apiKeys: ApiKeyService, private readonly inference: InferenceService) {}

  async handleConnection(client: Socket) {
    const apiKey = client.handshake.auth?.apiKey || client.handshake.headers['x-api-key'];
    const valid = typeof apiKey === 'string' && await this.apiKeys.validateApiKey(apiKey as string);
    if (!valid) {
      client.emit('error', { code: 1008, message: 'Invalid API key' });
      client.disconnect(true);
      return;
    }
    this.clientBuffers.set(client.id, []);
    client.emit('connected', { ok: true, namespace: 'stt' });
  }

  handleDisconnect(client: Socket) {
    this.clientBuffers.delete(client.id);
  }

  @SubscribeMessage('audio_chunk')
  onAudioChunk(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (!data?.data) return;
    const list = this.clientBuffers.get(client.id) || [];
    list.push(data.data); // base64 chunk
    this.clientBuffers.set(client.id, list);
    client.emit('partial', { text: '...' });
  }

  @SubscribeMessage('audio_done')
  async onAudioDone(@ConnectedSocket() client: Socket) {
    const chunks = this.clientBuffers.get(client.id) || [];
    const audioBase64 = chunks.join('');
    try {
      for await (const evt of this.inference.sttStream({ audioBase64 })) {
        if (evt?.type === 'partial' && evt.text) client.emit('partial', { text: evt.text });
        if (evt?.type === 'final' && evt.text) client.emit('final', { text: evt.text });
        if (evt?.type === 'done') client.emit('done', { reason: 'completed' });
      }
      client.emit('done', { reason: 'completed' });
    } catch (e: any) {
      client.emit('error', { message: e?.message || 'STT failed' });
    } finally {
      this.clientBuffers.delete(client.id);
    }
  }
} 