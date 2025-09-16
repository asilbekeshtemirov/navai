import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { ApiResponse } from './utils/apiResponse';

@Controller({
  version: VERSION_NEUTRAL,
})
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@Res() res: Response) {
    const response = this.appService.getHello();
    return ApiResponse.success(res, response);
  }

  @Get('version')
  getVersion(@Res() res: Response) {
    const response = this.appService.getVersion();
    return ApiResponse.success(res, response);
  }
}