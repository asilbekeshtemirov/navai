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
      
      // Create default admin user
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      // Check if we can connect to the database
      try {
        // Test database connection first
        const dbHealth = await this.db.healthCheck();
        const isConnected = typeof dbHealth === 'boolean' ? dbHealth : dbHealth.status;
        
        if (!isConnected) {
          logger.warn('Database seeding skipped due to connection issues');
          return;
        }
        
        const existingAdmin = await this.db.user.findUnique({
          where: { email: adminEmail },
        });
        
        if (!existingAdmin) {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          
          await this.db.user.create({
            data: {
              email: adminEmail,
              password: hashedPassword,
              role: UserRole.SUPER_ADMIN,
              isActive: true,
            },
          });
          
          logger.info('Admin user created', { email: adminEmail });
        } else {
          logger.info('Admin user already exists', { email: adminEmail });
        }
        
        logger.info('Database seeding completed');
      } catch (dbError) {
        logger.warn('Database seeding skipped due to connection issues', { error: dbError.message });
      }
    } catch (error) {
      logger.error('Database seeding failed', { error: error.message });
      // Don't throw error as seeding should not fail the application startup
    }
  }
}