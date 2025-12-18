import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';

interface FindAllPayload {
  tenantId: string;
}

interface FindOnePayload {
  tenantId: string;
  id: string;
}

interface CreatePayload {
  tenantId: string;
  email: string;
  name?: string;
}

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: 'users.findAll' })
  findAll(@Payload() data: FindAllPayload) {
    console.log(`Users Service: Finding all users for tenant ${data.tenantId}`);
    return this.usersService.findAll(data.tenantId);
  }

  @MessagePattern({ cmd: 'users.findOne' })
  findOne(@Payload() data: FindOnePayload) {
    console.log(`Users Service: Finding user ${data.id} for tenant ${data.tenantId}`);
    return this.usersService.findOne(data.tenantId, data.id);
  }

  @MessagePattern({ cmd: 'users.create' })
  create(@Payload() data: CreatePayload) {
    console.log(`Users Service: Creating user for tenant ${data.tenantId}`);
    return this.usersService.create(data.tenantId, {
      email: data.email,
      name: data.name,
    });
  }
}
