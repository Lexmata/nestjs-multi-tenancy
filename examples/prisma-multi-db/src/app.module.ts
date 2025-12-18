import { Module } from '@nestjs/common';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

// Tenant configuration with database URLs
const tenantDatabases = new Map([
  [
    'acme',
    {
      id: 'acme',
      name: 'Acme Corporation',
      databaseUrl:
        process.env.ACME_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/acme',
    },
  ],
  [
    'globex',
    {
      id: 'globex',
      name: 'Globex Inc',
      databaseUrl:
        process.env.GLOBEX_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/globex',
    },
  ],
]);

@Module({
  imports: [
    MultiTenantModule.forRoot({
      tenantIdentifier: {
        type: 'header',
        headerName: 'X-Tenant-ID',
      },
      tenantResolver: async (tenantId) => {
        return tenantDatabases.get(tenantId) || null;
      },
    }),
    PrismaModule,
    UsersModule,
  ],
})
export class AppModule {}
