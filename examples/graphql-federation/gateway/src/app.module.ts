import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';

// Custom data source that forwards tenant header to subgraphs
class TenantAwareDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: { request: any; context: any }) {
    // Forward tenant header to subgraph
    if (context.tenantId) {
      request.http.headers.set('x-tenant-id', context.tenantId);
    }
  }
}

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
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'users', url: 'http://localhost:4001/graphql' },
            // Add more subgraphs here
          ],
        }),
        buildService({ url }) {
          return new TenantAwareDataSource({ url });
        },
      },
      // Build context from request
      context: ({ req }) => ({
        tenantId: req.headers['x-tenant-id'],
        tenant: req.tenant,
      }),
    }),
  ],
})
export class AppModule {}
