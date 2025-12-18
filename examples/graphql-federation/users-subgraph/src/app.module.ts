import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { UsersModule } from './users/users.module';

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
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      // Pass tenant info to GraphQL context
      context: ({ req }) => ({
        tenantId: req.headers['x-tenant-id'],
        tenant: req.tenant,
      }),
    }),
    UsersModule,
  ],
})
export class AppModule {}
