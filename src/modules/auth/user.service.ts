import { Injectable, BadRequestException } from '@nestjs/common';
import { DbService } from '../../config/db.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly db: DbService) {}

  async findAll() {
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      return [];
    }

    return this.db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOneById(id: string) {
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      return null;
    }

    return this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateRole(id: string, role: UserRole) {
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      throw new BadRequestException('Database is disabled in development mode');
    }

    return this.db.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deactivate(id: string) {
    // Check if database is enabled
    if (!this.db.isDatabaseEnabled()) {
      throw new BadRequestException('Database is disabled in development mode');
    }

    return this.db.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}