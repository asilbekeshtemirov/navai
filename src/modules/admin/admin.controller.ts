import { Controller, Get, Param, Put, Body, Delete, UseGuards } from '@nestjs/common';
import { UserService } from '../auth/user.service';
import { UserRole } from '@prisma/client';
import { UpdateUserRoleDto } from './admin.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  async getAllUsers() {
    return this.userService.findAll();
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.userService.findOneById(id);
  }

  @Put('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() updateRoleDto: UpdateUserRoleDto) {
    return this.userService.updateRole(id, updateRoleDto.role);
  }

  @Delete('users/:id')
  async deactivateUser(@Param('id') id: string) {
    return this.userService.deactivate(id);
  }
}