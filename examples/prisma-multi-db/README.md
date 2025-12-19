# Prisma Multi-DB Example

Database-per-tenant pattern using Prisma with dynamic database connections.

## Features

- Separate PostgreSQL database per tenant
- Dynamic Prisma client creation
- Connection pooling per tenant
- Complete data isolation

## Architecture

```
Request with X-Tenant-ID: acme
          │
          ▼
┌─────────────────────┐
│   NestJS Gateway    │
│  (Tenant Resolver)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐      ┌────────────────┐
│ TenantPrismaService │─────▶│ Acme Database  │
│  (Connection Pool)  │      └────────────────┘
└─────────────────────┘      ┌────────────────┐
                        ────▶│ Globex Database│
                             └────────────────┘
```

## Quick Start

```bash
# Start PostgreSQL with tenant databases
docker compose up -d

# Install dependencies
pnpm install

# Generate Prisma client
pnpm run db:generate

# Start the server
pnpm run start:dev
```

## Try It Out

### Acme tenant

```bash
curl -H "X-Tenant-ID: acme" http://localhost:3000/users
```

Response (from acme database):
```json
[
  { "id": "...", "email": "admin@acme.com", "name": "Acme Admin" },
  { "id": "...", "email": "user@acme.com", "name": "Acme User" }
]
```

### Globex tenant

```bash
curl -H "X-Tenant-ID: globex" http://localhost:3000/users
```

Response (from globex database):
```json
[
  { "id": "...", "email": "admin@globex.com", "name": "Globex Admin" },
  { "id": "...", "email": "engineer@globex.com", "name": "Globex Engineer" }
]
```

## Key Implementation

### TenantPrismaService

```typescript
@Injectable()
export class TenantPrismaService {
  private clients = new Map<string, PrismaClient>();

  constructor(private readonly tenantContext: TenantContextService) {}

  getClient(): PrismaClient {
    const tenant = this.tenantContext.getTenant<TenantWithDb>();

    if (!this.clients.has(tenant.id)) {
      const client = new PrismaClient({
        datasources: {
          db: { url: tenant.databaseUrl },
        },
      });
      this.clients.set(tenant.id, client);
    }

    return this.clients.get(tenant.id);
  }
}
```

### Usage in Service

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async findAll() {
    // Automatically uses correct tenant's database
    return this.prisma.getClient().user.findMany();
  }
}
```

## Environment Variables

```env
ACME_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/acme
GLOBEX_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/globex
```

## When to Use This Pattern

✅ **Good for:**
- Strict data isolation requirements
- Different database scaling per tenant
- Compliance requirements (data residency)
- Large tenants with distinct workloads

❌ **Consider alternatives for:**
- Many small tenants (connection overhead)
- Shared queries across tenants
- Simple multi-tenancy needs


