import { Module } from '@nestjs/common';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';

// Mock tenant database
const tenants = new Map([
  ['acme', { id: 'acme', name: 'Acme Corporation', plan: 'enterprise' }],
  ['globex', { id: 'globex', name: 'Globex Inc', plan: 'pro' }],
  ['initech', { id: 'initech', name: 'Initech', plan: 'starter' }],
]);

@Module({
  imports: [
    MultiTenantModule.forRoot({
      tenantIdentifier: {
        type: 'header',
        headerName: 'X-Tenant-ID',
      },
      tenantResolver: async (tenantId) => {
        // Simulate database lookup
        const tenant = tenants.get(tenantId);
        return tenant || null;
      },
      excludeRoutes: ['/health', '/health/*'],
    }),
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
