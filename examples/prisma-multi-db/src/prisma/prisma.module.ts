import { Module, Global } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';

@Global()
@Module({
  providers: [TenantPrismaService],
  exports: [TenantPrismaService],
})
export class PrismaModule {}
