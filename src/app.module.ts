import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RequestIdMiddleware } from './middlewares/requestId.middleware';
import { RequestLoggerMiddleware } from './middlewares/requestLogger.middleware';
import { MetricsMiddleware } from './middlewares/metrics.middleware';
import { SecurityMiddleware } from './middlewares/security.middleware';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ChatModule } from './modules/chat/chat.module';
import { ConfigModule } from './config/config.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AdminModule } from './modules/admin/admin.module';
import { ApiKeyModule } from './modules/apikeys/apikey.module';
import { GuardsModule } from './guards/guards.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule,
    GuardsModule,
    HealthModule,
    AuthModule,
    UploadsModule,
    ChatModule,
    AdminModule,
    ApiKeyModule,
    MetricsModule,
    RealtimeModule,
    JobsModule,
    // Serve static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        SecurityMiddleware,
        RequestIdMiddleware,
        MetricsMiddleware,
        RequestLoggerMiddleware
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}