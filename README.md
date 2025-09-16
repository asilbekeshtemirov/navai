# Nav AI Service (NestJS)

A production-ready NestJS service skeleton for Control and Data Plane orchestration.

## Features
- Health checks: `/healthz`, `/ping` returning `{ db: boolean, redis: boolean }`
- Global validation with detailed 400 errors (array of violated fields)
- Structured JSON errors for unknown routes (404)
- Logging with `X-Request-ID` on every request
- Swagger docs at `/docs` with project title/version
- Prisma (Postgres) and Redis wiring, fail-fast in production
- Auth stub (email/password + JWT) and API Keys module
- Uploads (presigned URL scaffolding) and WebSocket gateway stubs
- Realtime STT `/ws/stt` and TTS `/ws/tts` gateways with handshake validation
- Redis Pub/Sub based `JobsService` for background job orchestration

## Architecture
- Control Plane (CPU):
  - Public REST: `auth`, `api-keys`, `uploads`, `admin`, `metrics` (see `/docs`)
  - DB: Postgres via Prisma, request-scoped logging with request IDs
- Data Plane (GPU):
  - WebSockets: `ws://host/ws/stt` and `ws://host/ws/tts`
  - Handshake requires `apiKey` in Socket.io auth or `X-API-Key` header; invalid → error + disconnect (policy violation)
  - Echo stubs now; replace with `InferenceService` calls to your GPU/LB
- Storage/CDN:
  - Presigned upload/download helpers in `uploads` module
- Queueing:
  - `JobsService` uses Redis Pub/Sub for enqueue/subscribe

## Quick Start

```bash
npm i
cp .env.example .env
npm run start:dev
```

Open:
- Docs: http://localhost:3000/docs
- Health: http://localhost:3000/healthz
- Ping: http://localhost:3000/ping
- WS (STT): namespace `/ws/stt`
- WS (TTS): namespace `/ws/tts`

### WebSocket handshake example (Socket.io client)
```js
const stt = io('http://localhost:3000/ws/stt', { auth: { apiKey: 'prefix.suffix' }})
stt.on('connected', console.log)
stt.emit('audio_chunk', { seq: 0, data: 'base64...' })
stt.emit('audio_done')
```

## Environment

Minimal `.env` for local dev:
```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/navai
DB_DISABLED=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DISABLED=false

# Auth
JWT_ACCESS_SECRET=access_secret
JWT_REFRESH_SECRET=refresh_secret
```

Notes:
- Set `DB_DISABLED=true` or `REDIS_DISABLED=true` in development to run offline.
- In production, DB/Redis failures will cause the app to exit (fail fast) with clear logs.

## HTTPS
- Provide TLS key/cert paths via env:
  - `SSL_KEY_PATH=./certs/key.pem`
  - `SSL_CERT_PATH=./certs/cert.pem`
- On startup, if both files exist, server runs on HTTPS and WS becomes WSS automatically.
- For local self-signed certs, you can generate with:
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

## Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

## Scripts

```bash
npm run start        # dev
npm run start:dev    # watch
npm run start:prod   # prod
```

## Conventions
- All responses use a consistent JSON envelope via `ApiResponse`.
- Unknown routes return JSON 404 with `message: "Route not found"`.
- Validation errors return 400 with an array like `[{ field, constraints }]`.

## Streaming (Realtime)
- Set provider endpoints to support streaming responses (SSE or NDJSON):
  - `STT_URL` (expects partial/final/done JSON events)
  - `TTS_URL` (expects audio frame events with `{ type: 'audio', frame: '<base64>' }`)
- The server forwards provider stream events directly to clients via Socket.io.
- Client examples:
```js
// STT
const stt = io(BASE + '/ws/stt', { auth: { apiKey } });
stt.emit('audio_chunk', { data: base64Chunk });
stt.emit('audio_done');
stt.on('partial', ({ text }) => console.log('partial', text));
stt.on('final', ({ text }) => console.log('final', text));

// TTS
const tts = io(BASE + '/ws/tts', { auth: { apiKey } });
tts.emit('speak', { text: 'Hello' });
tts.on('audio', ({ frame }) => playBase64(frame));
```
