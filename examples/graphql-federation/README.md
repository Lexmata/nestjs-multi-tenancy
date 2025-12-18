# GraphQL Federation Example

Multi-tenant Apollo Federation setup with tenant-aware subgraphs.

## Architecture

```
          ┌───────────────────────────┐
          │   Apollo Gateway          │
          │   (Port 4000)             │
          │                           │
          │   - Federation routing    │
          │   - Tenant extraction     │
          └─────────────┬─────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
┌─────────────────┐          ┌─────────────────┐
│ Users Subgraph  │          │ Other Subgraph  │
│ (Port 4001)     │          │ (Port 4002)     │
│                 │          │                 │
│ - User type     │          │ - Extended      │
│ - Tenant filter │          │   entities      │
└─────────────────┘          └─────────────────┘
```

## Features

- Apollo Federation 2 gateway
- Tenant context in GraphQL context
- Subgraph resolvers with tenant decorators
- Tenant header propagation to subgraphs

## Quick Start

```bash
# Terminal 1: Start Users Subgraph
cd users-subgraph
pnpm install
pnpm run start:dev

# Terminal 2: Start Gateway
cd gateway
pnpm install
pnpm run start:dev
```

## Try It Out

### GraphQL Playground

Open http://localhost:4000/graphql

### Query with tenant header

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{"query": "{ users { id email name } }"}'
```

### Create user mutation

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{"query": "mutation { createUser(email: \"new@acme.com\", name: \"New User\") { id email } }"}'
```

## Key Implementation

### Gateway Context

```typescript
@Injectable()
export class TenantContextPlugin implements ApolloServerPlugin {
  async requestDidStart({ request, contextValue }) {
    const tenantId = request.http?.headers.get('x-tenant-id');
    contextValue.tenantId = tenantId;
    
    return {
      async willSendSubgraphRequest({ requestContext, subgraphName }) {
        // Forward tenant header to subgraphs
        requestContext.request.http.headers.set('x-tenant-id', tenantId);
      }
    };
  }
}
```

### Subgraph Resolver

```typescript
@Resolver(() => User)
export class UsersResolver {
  @Query(() => [User])
  @RequireTenant()
  async users(@CurrentTenant() tenant: Tenant) {
    return this.usersService.findAll(tenant.id);
  }
}
```

## Project Structure

```
graphql-federation/
├── gateway/                # Apollo Gateway
│   └── src/
│       ├── main.ts
│       └── app.module.ts
│
└── users-subgraph/         # Users Federation Subgraph
    └── src/
        ├── main.ts
        ├── app.module.ts
        └── users/
            ├── users.module.ts
            ├── users.resolver.ts
            └── users.service.ts
```

