# Microservices Example

Demonstrates tenant context propagation across NestJS microservices using TCP transport.

## Architecture

```
┌──────────────────────┐         ┌────────────────────┐
│   API Gateway        │  TCP    │   Users Service    │
│   (Port 3000)        │────────▶│   (Port 3001)      │
│                      │         │                    │
│  - HTTP endpoints    │         │  - User CRUD       │
│  - Tenant extraction │         │  - Tenant context  │
│  - Request routing   │         │  - Data isolation  │
└──────────────────────┘         └────────────────────┘
```

## Features

- Tenant context propagated via message metadata
- Microservice handlers with tenant decorators
- Gateway forwards tenant info to services
- Complete data isolation per tenant

## Quick Start

```bash
# Terminal 1: Start Users Service
cd users-service
pnpm install
pnpm run start:dev

# Terminal 2: Start Gateway
cd gateway
pnpm install
pnpm run start:dev
```

## Try It Out

```bash
# List users for acme tenant
curl -H "X-Tenant-ID: acme" http://localhost:3000/users

# List users for globex tenant
curl -H "X-Tenant-ID: globex" http://localhost:3000/users

# Create user
curl -X POST \
  -H "X-Tenant-ID: acme" \
  -H "Content-Type: application/json" \
  -d '{"email": "new@acme.com", "name": "New User"}' \
  http://localhost:3000/users
```

## Key Implementation

### Gateway → Service (Tenant Propagation)

```typescript
// gateway/src/users/users.controller.ts
@Get()
@RequireTenant()
async findAll(@TenantId() tenantId: string) {
  return this.usersClient.send(
    { cmd: 'users.findAll' },
    { tenantId },  // Pass tenant in payload
  );
}
```

### Service Handler (Receive Tenant)

```typescript
// users-service/src/users/users.controller.ts
@MessagePattern({ cmd: 'users.findAll' })
async findAll(@Payload() data: { tenantId: string }) {
  return this.usersService.findAll(data.tenantId);
}
```

## Project Structure

```
microservices/
├── gateway/               # HTTP API Gateway
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       └── users/
│           └── users.controller.ts
│
└── users-service/         # TCP Microservice
    └── src/
        ├── main.ts
        ├── app.module.ts
        └── users/
            ├── users.controller.ts
            └── users.service.ts
```

