import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async findAll() {
    // Automatically uses the correct tenant's database
    return this.prisma.getClient().user.findMany({
      include: { projects: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.getClient().user.findUnique({
      where: { id },
      include: { projects: true },
    });
  }

  async create(data: { email: string; name?: string }) {
    return this.prisma.getClient().user.create({
      data,
    });
  }

  async update(id: string, data: { email?: string; name?: string }) {
    return this.prisma.getClient().user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.getClient().user.delete({
      where: { id },
    });
  }
}
