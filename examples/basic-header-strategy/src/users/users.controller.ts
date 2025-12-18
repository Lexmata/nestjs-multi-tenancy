import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  TenantGuard,
  RequireTenant,
  CurrentTenant,
  TenantId,
  Tenant,
} from '@lexmata/nestjs-multi-tenant';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequireTenant()
  findAll(@CurrentTenant() tenant: Tenant, @TenantId() tenantId: string) {
    console.log(`Listing users for tenant: ${tenant.name} (${tenantId})`);
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @RequireTenant()
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Post()
  @RequireTenant()
  create(@Body() data: { email: string; name: string }, @TenantId() tenantId: string) {
    return this.usersService.create(tenantId, data);
  }
}
