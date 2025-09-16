import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserService } from '../auth/user.service';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [AdminController],
  providers: [UserService],
  exports: [UserService],
})
export class AdminModule {}