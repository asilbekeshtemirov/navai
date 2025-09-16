import { Injectable } from '@nestjs/common';
import client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: client.Registry;

  constructor() {
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });
  }

  getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }

  async resetMetrics(): Promise<void> {
    this.register.resetMetrics();
  }
}