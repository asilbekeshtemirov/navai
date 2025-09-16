import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { DbService } from '../../config/db.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import logger from '../../utils/logger';

@Injectable()
export class ApiKeyService {
  constructor(private readonly db: DbService) {}

  async createApiKey(userId: string, name: string) {
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      throw new BadRequestException('Database is disabled in development mode');
    }

    // Generate a new API key
    const keyPrefix = uuidv4().substring(0, 8);
    const keySuffix = uuidv4().replace(/-/g, '');
    const apiKey = `${keyPrefix}.${keySuffix}`;
    
    // Hash the key for storage
    const keyHash = await bcrypt.hash(apiKey, 10);
    
    // Store the key in the database
    const storedKey = await this.db.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        userId,
      },
    });
    
    logger.info('API key created', { userId, keyId: storedKey.id });
    
    return {
      id: storedKey.id,
      name: storedKey.name,
      prefix: storedKey.keyPrefix,
      key: apiKey, // Return the full key only once
      createdAt: storedKey.createdAt,
    };
  }

  async getApiKeys(userId: string) {
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      return [];
    }

    return this.db.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
      },
    });
  }

  async deactivateApiKey(id: string, userId: string) {
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      throw new BadRequestException('Database is disabled in development mode');
    }

    return this.db.apiKey.update({
      where: { id, userId },
      data: { isActive: false },
    });
  }

  async validateApiKey(key: string): Promise<boolean> {
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      return false;
    }

    try {
      const parts = key.split('.');
      if (parts.length !== 2) return false;
      
      const [prefix, suffix] = parts;
      
      // Find the key by prefix
      const storedKey = await this.db.apiKey.findUnique({
        where: { keyPrefix: prefix },
      });
      
      if (!storedKey || !storedKey.isActive) return false;
      
      // Verify the key
      const isValid = await bcrypt.compare(key, storedKey.keyHash);
      
      if (isValid) {
        // Update last used timestamp
        await this.db.apiKey.update({
          where: { id: storedKey.id },
          data: { lastUsedAt: new Date() },
        });
        
        logger.info('API key validated', { keyId: storedKey.id });
      }
      
      return isValid;
    } catch (error) {
      logger.error('API key validation failed', { error: error.message });
      return false;
    }
  }
}