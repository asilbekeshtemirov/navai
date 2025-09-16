import { Controller, Post, Get, Delete, Param, Body, Req, Res, UseGuards, ConflictException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiKeyService } from './apikey.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthGuard } from '../../guards/auth.guard';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(AuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @SwaggerApiResponse({ status: 201, description: 'API key created' })
  @SwaggerApiResponse({ status: 400, description: 'Duplicate key name' })
  async createApiKey(@Req() req: Request, @Res() res: Response, @Body('name') name: string) {
    const requestId = res.locals.requestId || 'unknown';
    const userId = (req as any).user?.id; // Assuming user is attached to request after auth
    
    try {
      const result = await this.apiKeyService.createApiKey(userId, name);
      ApiResponse.created(res, result, 'API key created successfully');
    } catch (error) {
      if (error instanceof ConflictException) {
        ApiResponse.badRequest(res, error.message);
      } else {
        throw error;
      }
    }
  }

  @Get()
  @ApiOperation({ summary: 'List API keys' })
  async getApiKeys(@Req() req: Request, @Res() res: Response) {
    const requestId = res.locals.requestId || 'unknown';
    const userId = (req as any).user?.id; // Assuming user is attached to request after auth
    
    try {
      const result = await this.apiKeyService.getApiKeys(userId);
      ApiResponse.success(res, result);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke (deactivate) an API key' })
  async deactivateApiKey(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const requestId = res.locals.requestId || 'unknown';
    const userId = (req as any).user?.id; // Assuming user is attached to request after auth
    
    try {
      await this.apiKeyService.deactivateApiKey(id, userId);
      ApiResponse.success(res, null, 'API key deactivated successfully');
    } catch (error) {
      throw error;
    }
  }
}