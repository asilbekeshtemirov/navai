import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto, SignInDto, RefreshTokenDto } from './auth.dto';
import { ApiResponse } from '../../utils/apiResponse';
import logger from '../../utils/logger';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Sign up with email/password' })
  @SwaggerApiResponse({ status: 201, description: 'User registered successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid payload or user exists' })
  async signUp(@Body() dto: SignUpDto, @Req() req: Request, @Res() res: Response) {
    const requestId = res.locals.requestId || 'unknown';
    
    try {
      const result = await this.authService.signUp(dto, requestId);
      ApiResponse.created(res, result, 'User registered successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        ApiResponse.badRequest(res, error.message);
      } else {
        throw error;
      }
    }
  }

  @Post('signin')
  @ApiOperation({ summary: 'Sign in with email/password' })
  @SwaggerApiResponse({ status: 200, description: 'User signed in successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() dto: SignInDto, @Req() req: Request, @Res() res: Response) {
    const requestId = res.locals.requestId || 'unknown';
    
    try {
      const result = await this.authService.signIn(dto, requestId);
      ApiResponse.success(res, result, 'User signed in successfully');
    } catch (error) {
      if (error.message.includes('Invalid credentials')) {
        ApiResponse.unauthorized(res, 'Invalid email or password');
      } else {
        throw error;
      }
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @SwaggerApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res() res: Response) {
    const requestId = res.locals.requestId || 'unknown';
    
    try {
      const tokens = await this.authService.refreshToken(dto.refreshToken, requestId);
      ApiResponse.success(res, { tokens }, 'Token refreshed successfully');
    } catch (error) {
      ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @SwaggerApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res() res: Response) {
    const requestId = res.locals.requestId || 'unknown';
    
    await this.authService.logout(dto.refreshToken, requestId);
    ApiResponse.success(res, null, 'Logged out successfully');
  }
}