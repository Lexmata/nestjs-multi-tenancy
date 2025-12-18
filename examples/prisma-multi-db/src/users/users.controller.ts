import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TenantGuard, RequireTenant, CurrentTenant, Tenant } from '@lexmata/nestjs-multi-tenant';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequireTenant()
  findAll(@CurrentTenant() tenant: Tenant) {
    console.log(`Fetching users from ${tenant.name}'s database`);
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequireTenant()
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequireTenant()
  create(@Body() data: { email: string; name?: string }) {
    return this.usersService.create(data);
  }
}
