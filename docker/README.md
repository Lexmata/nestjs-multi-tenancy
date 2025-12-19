# Docker Development Environment

This directory contains Docker configuration for local development and testing.

## Quick Start

```bash
# Start all services
docker compose up -d

# Start only databases
docker compose up -d postgres mysql redis

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Primary database for testing |
| MySQL | 3306 | Alternative database for testing |
| Redis | 6379 | Cache for tenant resolver testing |
| Docs | 4200 | Documentation site (Angular) |
| Adminer | 8080 | Database management UI |

## Connection Details

### PostgreSQL
```
Host: localhost
Port: 5432
Database: multi_tenant_dev
User: postgres
Password: postgres
```

### MySQL
```
Host: localhost
Port: 3306
Database: multi_tenant_dev
User: mysql
Password: mysql
```

### Redis
```
Host: localhost
Port: 6379
```

## Sample Data

The `init-db.sql` script creates sample data:

### Tenants
| ID | Name | Slug | Plan |
|----|------|------|------|
| tenant-1 | Acme Corporation | acme | enterprise |
| tenant-2 | Globex Inc | globex | pro |
| tenant-3 | Initech | initech | starter |

### Users
Each tenant has admin and user accounts.

### Projects
Sample projects for testing tenant data isolation.

## Using with Integration Tests

```typescript
// Example: Connect to PostgreSQL
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/multi_tenant_dev',
    },
  },
});

// Example: Connect to Redis for caching
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});
```

## Building Documentation Site

```bash
# Build and run docs container
docker compose up -d docs

# Access at http://localhost:4200
```

## Resetting Database

```bash
# Stop containers and remove volumes
docker compose down -v

# Start fresh
docker compose up -d
```

## Troubleshooting

### Port conflicts
If ports are already in use, modify `docker-compose.yml`:
```yaml
ports:
  - '5433:5432'  # Use 5433 instead of 5432
```

### Container health
```bash
# Check container status
docker compose ps

# Check specific service health
docker inspect --format='{{.State.Health.Status}}' multi-tenant-postgres
```

### Logs
```bash
# All services
docker compose logs

# Specific service
docker compose logs postgres

# Follow logs
docker compose logs -f postgres
```


