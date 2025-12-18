import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { UsersController } from './users/users.controller';

// Mock tenant resolver
const tenants = new Map([
  ['acme', { id: 'acme', name: 'Acme Corporation' }],
  ['globex', { id: 'globex', name: 'Globex Inc' }],
]);

@Module({
  imports: [
    MultiTenantModule.forRoot({
      tenantIdentifier: {
        type: 'header',
        headerName: 'X-Tenant-ID',
      },
      tenantResolver: async (tenantId) => tenants.get(tenantId) || null,
    }),
    ClientsModule.register([
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
    ]),
  ],
  controllers: [UsersController],
})
export class AppModule {}
