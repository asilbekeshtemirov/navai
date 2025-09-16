import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { SignUpDto, SignInDto, RefreshTokenDto } from './auth.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { DbService } from '../../config/db.service';
import logger from '../../utils/logger';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private readonly db: DbService) {}

  async signUp(dto: SignUpDto, requestId: string) {
    logger.info('User signup attempt', { requestId, email: dto.email });

    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      throw new BadRequestException('Database is disabled in development mode');
    }

    // Check if user already exists
    const existingUser = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // Create user with name field
    const user = await this.db.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name, // Include the name field
        role: UserRole.USER,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user, requestId);

    logger.info('User registered successfully', { requestId, userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name, // Include name in response
        role: user.role,
      },
      tokens,
    };
  }

  async signIn(dto: SignInDto, requestId: string) {
    logger.info('User signin attempt', { requestId, email: dto.email });

    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      throw new BadRequestException('Database is disabled in development mode');
    }

    // Find user
    const user = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = this.generateTokens(user, requestId);

    logger.info('User signed in successfully', { requestId, userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name, // Include name in response
        role: user.role,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string, requestId: string) {
    logger.info('Token refresh attempt', { requestId });

    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      throw new BadRequestException('Database is disabled in development mode');
    }

    try {
      const payload: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
      
      // Check if user exists
      const user = await this.db.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token exists in database
      const storedToken = await this.db.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const tokens = this.generateTokens(user, requestId);

      logger.info('Token refreshed successfully', { requestId, userId: user.id });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { requestId, error: error.message });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string, requestId: string) {
    logger.info('User logout attempt', { requestId });

    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      logger.info('Logout successful (database disabled)', { requestId });
      return;
    }

    try {
      // Remove refresh token from database
      await this.db.refreshToken.delete({
        where: { token: refreshToken },
      });
      
      logger.info('User logged out successfully', { requestId });
    } catch (error) {
      logger.error('Logout failed', { requestId, error: error.message });
      // Don't throw error as logout should not fail the request
    }
  }

  private generateTokens(user: any, requestId: string) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_ACCESS_SECRET || 'access_secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      { expiresIn: '7d' }
    );

    // Store refresh token in database only if database is enabled
    if (this.db.isDatabaseEnabled()) {
      this.db.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      }).catch(error => {
        logger.error('Failed to store refresh token', { requestId, error: error.message });
      });
    }

    return { accessToken, refreshToken };
  }
}