# Example Projects

This directory contains complete, working example projects demonstrating various multi-tenancy patterns with `@lexmata/nestjs-multi-tenant`.

## Examples

| Example | Description | Key Features |
|---------|-------------|--------------|
| [basic-header-strategy](./basic-header-strategy) | Simple header-based tenant extraction | Basic setup, guards, decorators |
| [prisma-multi-db](./prisma-multi-db) | Database-per-tenant with Prisma | Dynamic connections, tenant isolation |
| [microservices](./microservices) | Microservice architecture | TCP transport, tenant propagation |
| [graphql-federation](./graphql-federation) | Apollo Federation with multi-tenancy | Subgraphs, gateway, tenant context |

## Quick Start

Each example is a standalone project. To run any example:

```bash
cd examples/<example-name>
pnpm install
pnpm run start:dev
```

## Example Details

### Basic Header Strategy

The simplest implementation using header-based tenant identification.

```bash
curl -H "X-Tenant-ID: acme" http://localhost:3000/users
```

### Prisma Multi-DB

Demonstrates database-per-tenant pattern where each tenant has their own database.

- Dynamic Prisma client creation
- Connection pooling per tenant
- Automatic tenant database routing

### Microservices

Shows tenant context propagation across microservices using NestJS TCP transport.

```
┌─────────────────┐     ┌──────────────────┐
│  API Gateway    │────▶│  Users Service   │
│  (HTTP + Auth)  │     │  (TCP Transport) │
└─────────────────┘     └──────────────────┘
```

### GraphQL Federation

Apollo Federation setup with tenant-aware subgraphs.

```
┌─────────────────┐
│    Gateway      │
│  (Apollo GW)    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Users │ │ Other │
│Subgraph│ │Subgraph│
└───────┘ └───────┘
```

## Testing

Each example includes tests:

```bash
cd examples/<example-name>
pnpm test
```

## Docker Support

Examples with databases include Docker Compose files:

```bash
cd examples/<example-name>
docker compose up -d
pnpm run start:dev
```

