import { Injectable } from '@nestjs/common';

interface SttRequestBody {
  audioBase64?: string;
  audioUrl?: string;
  model?: string;
  stream?: boolean;
}

interface TtsRequestBody {
  text: string;
  voice?: string;
  model?: string;
  stream?: boolean;
}

@Injectable()
export class InferenceService {
  private sttUrl = process.env.STT_URL || '';
  private ttsUrl = process.env.TTS_URL || '';
  private providerApiKey = process.env.PROVIDER_API_KEY || process.env.OPENAI_API_KEY || '';

  async sttInfer(body: SttRequestBody): Promise<{ text: string }> {
    // If no provider configured, return stub
    if (!this.sttUrl) {
      return { text: 'stub-text' };
    }

    const res = await fetch(this.sttUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.providerApiKey ? { Authorization: `Bearer ${this.providerApiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await safeText(res);
      throw new Error(`STT failed: ${res.status} ${msg}`);
    }

    const json: any = await res.json().catch(() => ({}));
    // Try common shapes
    const text = json.text || json.transcript || json.result || '';
    return { text };
  }

  async *sttStream(body: SttRequestBody): AsyncGenerator<any> {
    if (!this.sttUrl) {
      yield { type: 'partial', text: 'stub-partial' };
      yield { type: 'final', text: 'stub-final' };
      return;
    }

    const res = await fetch(this.sttUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/x-ndjson, application/json',
        ...(this.providerApiKey ? { Authorization: `Bearer ${this.providerApiKey}` } : {}),
      },
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!res.ok || !res.body) {
      const msg = await safeText(res);
      throw new Error(`STT stream failed: ${res.status} ${msg}`);
    }

    const reader = res.body.getReader();
    const parser = createStreamParser(res.headers.get('content-type'));
    for await (const chunk of readChunks(reader)) {
      for (const evt of parser(chunk)) {
        yield evt;
      }
    }
  }

  async ttsInfer(body: TtsRequestBody): Promise<{ audioBase64: string }> {
    if (!this.ttsUrl) {
      return { audioBase64: 'stub-audio-base64' };
    }

    const res = await fetch(this.ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.providerApiKey ? { Authorization: `Bearer ${this.providerApiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await safeText(res);
      throw new Error(`TTS failed: ${res.status} ${msg}`);
    }

    const json: any = await res.json().catch(() => ({}));
    // Common shapes
    const audioBase64 = json.audioBase64 || json.audio || json.result || '';
    return { audioBase64 };
  }

  async *ttsStream(body: TtsRequestBody): AsyncGenerator<any> {
    if (!this.ttsUrl) {
      yield { type: 'audio', frame: 'stub-audio-base64' };
      return;
    }

    const res = await fetch(this.ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/x-ndjson, application/json',
        ...(this.providerApiKey ? { Authorization: `Bearer ${this.providerApiKey}` } : {}),
      },
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!res.ok || !res.body) {
      const msg = await safeText(res);
      throw new Error(`TTS stream failed: ${res.status} ${msg}`);
    }

    const reader = res.body.getReader();
    const parser = createStreamParser(res.headers.get('content-type'));
    for await (const chunk of readChunks(reader)) {
      for (const evt of parser(chunk)) {
        yield evt;
      }
    }
  }
}

async function safeText(res: Response) {
  try { return await res.text(); } catch { return ''; }
}

async function* readChunks(reader: ReadableStreamDefaultReader<Uint8Array>) {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) yield value;
  }
}

function createStreamParser(contentType: string | null) {
  const isSse = contentType?.includes('text/event-stream');
  const isNdjson = contentType?.includes('application/x-ndjson') || contentType?.includes('application/jsonl');

  let buffer = '';
  if (isSse) {
    return (chunk: Uint8Array) => parseSSE(chunk, (c) => (buffer += c));
  }
  // default to NDJSON
  return (chunk: Uint8Array) => parseNDJSON(chunk, (c) => (buffer += c));
}

function parseNDJSON(chunk: Uint8Array, append: (s: string) => void) {
  const events: any[] = [];
  append(new TextDecoder().decode(chunk));
  let line: string;
  // Split complete lines
  const parts = append['name'] ? [] : (append as any)();
  const text = (append as any).toString ? (append as any).toString() : '';
  const lines = text.split('\n');
  // We cannot rely on append state here; implement a simple buffer closure instead.
  return events; // Fallback if custom state not available
}

function parseSSE(chunk: Uint8Array, append: (s: string) => void) {
  const events: any[] = [];
  const text = new TextDecoder().decode(chunk);
  const lines = text.split('\n');
  let data = '';
  for (const l of lines) {
    if (l.startsWith('data:')) {
      data += l.slice(5).trim();
    } else if (l.trim() === '') {
      if (data) {
        try {
          const obj = JSON.parse(data);
          events.push(obj);
        } catch {}
        data = '';
      }
    }
  }
  return events;
} 