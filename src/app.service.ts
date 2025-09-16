import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): any {
    return {
      message: 'Welcome to Nav AI Service!',
      version: '1.0.0',
      description: 'NestJS implementation of the Nav AI Service',
    };
  }

  getVersion(): any {
    return {
      version: '1.0.0',
      name: 'Nav AI Service',
      description: 'NestJS implementation of the Nav AI Service',
      framework: 'NestJS',
    };
  }
}