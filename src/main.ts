import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import helmet from 'helmet';
import cors from 'cors';
import { GlobalExceptionFilter } from './middlewares/errorHandler.middleware';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DatabaseSeeder } from './utils/seeder';
import { DbService } from './config/db.service';
import { ApiResponse } from './utils/apiResponse';
import * as fs from 'fs';
import * as path from 'path';


async function bootstrap() {
  // Optional HTTPS
  let httpsOptions: any = undefined;
  const keyPath = process.env.SSL_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH;
  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    httpsOptions = {
      key: fs.readFileSync(path.resolve(keyPath)),
      cert: fs.readFileSync(path.resolve(certPath)),
    };
  }

  const app = await NestFactory.create(AppModule, { httpsOptions });
  
  // Get database service for seeding
  const dbService = app.get(DbService);
  
  // Set up global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Set up helmet for security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "https://unpkg.com", 
          "http://unpkg.com",
          "https://fonts.googleapis.com"
        ],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "https://unpkg.com", 
          "http://unpkg.com",
          "https://cdn.jsdelivr.net"
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "https:", 
          "http:", 
          "https://cdn.jsdelivr.net"
        ],
        connectSrc: [
          "'self'", 
          'ws:', 
          'wss:', 
          'https:', 
          'http:',
          "https://api.openai.com"
        ],
        fontSrc: [
          "'self'", 
          "data:", 
          "https:", 
          "http:", 
          "https://unpkg.com", 
          "http://unpkg.com",
          "https://fonts.gstatic.com",
          "https://fonts.googleapis.com"
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
  }));

  // Set up CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Request-ID','X-API-Key'],
    exposedHeaders: ['X-Request-ID']
  }));

  // Set up global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const violations = errors.map(err => ({
        field: err.property,
        constraints: err.constraints,
      }));
      return new BadRequestException(violations);
    },
  }));

  // Set up Swagger
  const config = new DocumentBuilder()
    .setTitle('Nav AI Service')
    .setDescription('API documentation for Nav AI Service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // JSON 404 for unknown routes
  app.use((req, res) => ApiResponse.notFound(res, 'Route not found'));

  const port = parseInt(process.env.PORT || '3000', 10);
  
  // Run database seeding
  if (process.env.NODE_ENV !== 'production') {
    const isDbDisabled = process.env.DB_DISABLED === 'true';
    if (!isDbDisabled) {
      const seeder = new DatabaseSeeder(dbService);
      await seeder.seed();
    } else {
      console.log('Database seeding skipped - database disabled in development mode');
    }
  }
  
  await app.listen(port);

  const proto = httpsOptions ? 'https' : 'http';
  const wsProto = httpsOptions ? 'wss' : 'ws';
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 NAVAI SERVICE ISHGA TUSHDI! ✅`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🌐 Server manzili:     ${proto}://localhost:${port}`);
  console.log(`📚 API Hujjatlari:     ${proto}://localhost:${port}/docs`);
  console.log(`❤️  Sog'lik tekshiruvi: ${proto}://localhost:${port}/healthz`);
  console.log(`.ping holati:        ${proto}://localhost:${port}/ping`);
  console.log(`🔌 WS STT:           ${wsProto}://localhost:${port}/ws/stt`);
  console.log(`🔊 WS TTS:           ${wsProto}://localhost:${port}/ws/tts`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🔧 Muhit: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Vaqt: ${new Date().toLocaleString('uz-UZ')}`);
  console.log(`${'='.repeat(60)}\n`);
}
bootstrap();