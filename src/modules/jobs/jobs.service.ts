import { Injectable } from '@nestjs/common';
import { RedisService } from '../../config/redis.service';

@Injectable()
export class JobsService {
  constructor(private readonly redis: RedisService) {}

  async enqueue(channel: string, payload: any) {
    const client = this.redis.getClient();
    if (!client) return false;
    await client.publish(channel, JSON.stringify(payload));
    return true;
  }

  subscribe(channel: string, handler: (data: any) => void) {
    const client = this.redis.getClient();
    if (!client) return () => {};
    const sub = client.duplicate();
    sub.subscribe(channel, () => {});
    sub.on('message', (_ch, msg) => {
      try { handler(JSON.parse(msg)); } catch { /* noop */ }
    });
    return () => { sub.unsubscribe(channel); sub.quit(); };
  }
} 