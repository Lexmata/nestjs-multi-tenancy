import { Controller, Get, Post, Body, Param, Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  TenantGuard,
  RequireTenant,
  CurrentTenant,
  TenantId,
  Tenant,
} from '@lexmata/nestjs-multi-tenant';

@Controller('users')
@UseGuards(TenantGuard)
export class UsersController {
  constructor(@Inject('USERS_SERVICE') private readonly usersClient: ClientProxy) {}

  @Get()
  @RequireTenant()
  async findAll(@TenantId() tenantId: string, @CurrentTenant() tenant: Tenant) {
    console.log(`Gateway: Forwarding request for tenant ${tenant.name}`);

    return firstValueFrom(this.usersClient.send({ cmd: 'users.findAll' }, { tenantId }));
  }

  @Get(':id')
  @RequireTenant()
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return firstValueFrom(this.usersClient.send({ cmd: 'users.findOne' }, { tenantId, id }));
  }

  @Post()
  @RequireTenant()
  async create(@Body() data: { email: string; name?: string }, @TenantId() tenantId: string) {
    return firstValueFrom(this.usersClient.send({ cmd: 'users.create' }, { tenantId, ...data }));
  }
}
