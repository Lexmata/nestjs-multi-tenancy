# Basic Header Strategy Example

The simplest multi-tenancy setup using header-based tenant identification.

## Features

- Header-based tenant extraction (`X-Tenant-ID`)
- Tenant resolver for fetching tenant data
- Guards and decorators for route protection
- Excluded routes (health checks)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the server
pnpm run start:dev
```

## Try It Out

### List users for a tenant

```bash
curl -H "X-Tenant-ID: acme" http://localhost:3000/users
```

Response:
```json
[
  { "id": "1", "tenantId": "acme", "email": "admin@acme.com", "name": "Acme Admin" },
  { "id": "2", "tenantId": "acme", "email": "user@acme.com", "name": "Acme User" }
]
```

### Different tenant

```bash
curl -H "X-Tenant-ID: globex" http://localhost:3000/users
```

Response:
```json
[
  { "id": "3", "tenantId": "globex", "email": "admin@globex.com", "name": "Globex Admin" }
]
```

### Create a user

```bash
curl -X POST \
  -H "X-Tenant-ID: acme" \
  -H "Content-Type: application/json" \
  -d '{"email": "new@acme.com", "name": "New User"}' \
  http://localhost:3000/users
```

### Health check (no tenant required)

```bash
curl http://localhost:3000/health
```

### Missing tenant header (returns 403)

```bash
curl http://localhost:3000/users
```

## Project Structure

```
src/
├── main.ts              # Application entry point
├── app.module.ts        # Root module with MultiTenantModule config
├── health.controller.ts # Public health endpoint
└── users/
    ├── users.module.ts
    ├── users.controller.ts  # Protected routes with decorators
    └── users.service.ts     # Business logic with tenant filtering
```

## Key Code

### Module Configuration

```typescript
MultiTenantModule.forRoot({
  tenantIdentifier: {
    type: 'header',
    headerName: 'X-Tenant-ID',
  },
  tenantResolver: async (tenantId) => {
    // Look up tenant in your database
    return await db.tenants.findUnique({ where: { id: tenantId } });
  },
  excludeRoutes: ['/health'],
})
```

### Controller with Decorators

```typescript
@Controller('users')
@UseGuards(TenantGuard)
export class UsersController {
  @Get()
  @RequireTenant()
  findAll(@CurrentTenant() tenant: Tenant, @TenantId() tenantId: string) {
    return this.usersService.findAll(tenantId);
  }
}
```

