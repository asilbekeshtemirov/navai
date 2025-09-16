import { DbService } from '../config/db.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import logger from './logger';

export class DatabaseSeeder {
  constructor(private readonly db: DbService) {}

  async seed() {
    try {
      logger.info('Starting database seeding...');
      
      // Check if database is disabled in development mode
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isDbDisabled = process.env.DB_DISABLED === 'true';
      
      if (isDevelopment && isDbDisabled) {
        logger.info('Database seeding skipped - database disabled in development mode');
        return;
      }
      
      // Check if we can connect to the database
      try {
        // Test database connection first
        const dbHealth = await this.db.healthCheck();
        const isConnected = typeof dbHealth === 'boolean' ? dbHealth : dbHealth.status;
        
        if (!isConnected) {
          logger.warn('Database seeding skipped due to connection issues');
          return;
        }
        
        // Create default users for each role
        await this.createDefaultUser('superadmin@example.com', 'SuperAdmin123', UserRole.SUPER_ADMIN, 'Super Admin');
        await this.createDefaultUser('admin@example.com', 'Admin123', UserRole.ADMIN, 'Admin User');
        await this.createDefaultUser('moderator@example.com', 'Moderator123', UserRole.MODERATOR, 'Moderator User');
        await this.createDefaultUser('premium@example.com', 'Premium123', UserRole.PREMIUM, 'Premium User');
        await this.createDefaultUser('user@example.com', 'User123', UserRole.USER, 'Regular User');
        await this.createDefaultUser('guest@example.com', 'Guest123', UserRole.GUEST, 'Guest User');
        
        logger.info('Database seeding completed');
      } catch (dbError) {
        logger.warn('Database seeding skipped due to connection issues', { error: dbError.message });
      }
    } catch (error) {
      logger.error('Database seeding failed', { error: error.message });
      // Don't throw error as seeding should not fail the application startup
    }
  }

  private async createDefaultUser(email: string, password: string, role: UserRole, name: string) {
    try {
      const existingUser = await this.db.user.findUnique({
        where: { email: email },
      });
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await this.db.user.create({
          data: {
            email: email,
            password: hashedPassword,
            name: name,
            role: role,
            isActive: true,
          },
        });
        
        logger.info(`${role} user created`, { email: email, name: name });
      } else {
        logger.info(`${role} user already exists`, { email: email, name: existingUser.name || 'Unknown' });
      }
    } catch (error) {
      logger.error(`Failed to create ${role} user`, { email: email, error: error.message });
    }
  }
}