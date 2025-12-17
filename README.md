# @lexmata/nestjs-multi-tenant

[![npm version](https://img.shields.io/npm/v/@lexmata/nestjs-multi-tenant.svg?style=flat-square)](https://www.npmjs.com/package/@lexmata/nestjs-multi-tenant)
[![npm downloads](https://img.shields.io/npm/dm/@lexmata/nestjs-multi-tenant.svg?style=flat-square)](https://www.npmjs.com/package/@lexmata/nestjs-multi-tenant)
[![CI](https://img.shields.io/github/actions/workflow/status/Lexmata/nestjs-multi-tenancy/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Lexmata/nestjs-multi-tenancy/actions/workflows/ci.yml)
[![codecov](https://img.shields.io/codecov/c/github/Lexmata/nestjs-multi-tenancy?style=flat-square)](https://codecov.io/gh/Lexmata/nestjs-multi-tenancy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@lexmata/nestjs-multi-tenant.svg?style=flat-square)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10.x%20%7C%2011.x-ea2845.svg?style=flat-square)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=flat-square)](https://www.typescriptlang.org)

A flexible NestJS module for building multi-tenant applications. Supports multiple tenant identification strategies and provides seamless tenant context management throughout your application.

<p align="center">
  <a href="https://lexmata.github.io/nestjs-multi-tenancy/">📖 Documentation</a> •
  <a href="https://github.com/Lexmata/nestjs-multi-tenancy/issues">🐛 Report Bug</a> •
  <a href="https://github.com/Lexmata/nestjs-multi-tenancy/issues">✨ Request Feature</a>
</p>

## Features

- 🔌 **Multiple extraction strategies** - Header, subdomain, path, query parameter, or custom
- 🧵 **AsyncLocalStorage context** - Access tenant info anywhere without prop drilling
- 🔒 **Guards & decorators** - Declarative tenant requirements
- ⚡ **Async configuration** - Load config from external sources
- 🎯 **Route exclusions** - Skip tenant extraction for specific routes
- 📦 **Zero dependencies** - Only requires NestJS peer dependencies

## Installation

```bash
# npm
npm install @lexmata/nestjs-multi-tenant

# yarn
yarn add @lexmata/nestjs-multi-tenant

# pnpm
pnpm add @lexmata/nestjs-multi-tenant
```

### Peer Dependencies

This package requires the following peer dependencies:

```json
{
  "@nestjs/common": "^10.0.0 || ^11.0.0",
  "@nestjs/core": "^10.0.0 || ^11.0.0",
  "reflect-metadata": "^0.1.13 || ^0.2.0",
  "rxjs": "^7.0.0"
}
```

## Quick Start

### 1. Import the module

```typescript
import { Module } from '@nestjs/common';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';

@Module({
  imports: [
    MultiTenantModule.forRoot({
      extractionStrategy: 'header',
      tenantHeader: 'x-tenant-id',
    }),
  ],
})
export class AppModule {}
```

### 2. Use in your controllers

```typescript
import { Controller, Get } from '@nestjs/common';
import { CurrentTenant, TenantId, Tenant } from '@lexmata/nestjs-multi-tenant';

@Controller('users')
export class UsersController {
  @Get()
  findAll(@CurrentTenant() tenant: Tenant) {
    console.log(`Fetching users for tenant: ${tenant.id}`);
    return this.usersService.findAll(tenant.id);
  }

  @Get('profile')
  getProfile(@TenantId() tenantId: string) {
    return this.usersService.getProfile(tenantId);
  }
}
```

### 3. Access tenant anywhere with TenantContextService

```typescript
import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable()
export class UsersService {
  constructor(private readonly tenantContext: TenantContextService) {}

  findAll() {
    const tenantId = this.tenantContext.getTenantId();
    // Use tenantId for database queries, etc.
  }
}
```

## Configuration Options

### Basic Configuration

```typescript
MultiTenantModule.forRoot({
  // Extraction strategy (default: 'header')
  extractionStrategy: 'header' | 'subdomain' | 'path' | 'query' | 'cookie' | 'jwt' | 'bearer' | 'custom',

  // Header name for 'header' strategy (default: 'x-tenant-id')
  tenantHeader: 'x-tenant-id',

  // Query param for 'query' strategy (default: 'tenantId')
  tenantQueryParam: 'tenantId',

  // Path segment index for 'path' strategy (default: 0)
  tenantPathIndex: 0,

  // Cookie name for 'cookie' strategy (default: 'tenant_id')
  tenantCookie: 'tenant_id',

  // JWT claim path for 'jwt' strategy (default: 'tenantId')
  // Supports dot notation for nested claims (e.g., 'user.tenantId')
  jwtTenantClaim: 'tenantId',

  // Function to resolve tenant ID from bearer token (for 'bearer' strategy)
  bearerTokenResolver: async (token) => {
    const apiKey = await apiKeyService.findByKey(token);
    return apiKey?.tenantId ?? null;
  },

  // Cache configuration for tenant resolver (reduces database lookups)
  tenantResolverCache: {
    enabled: true,           // Enable caching
    ttl: 300_000,           // 5 minutes (default)
    max: 1000,              // Max entries (default)
  },

  // Event hooks for logging, metrics, and custom logic
  eventHooks: {
    onTenantIdExtracted: (tenantId, ctx) => {
      logger.debug(`Tenant ID extracted: ${tenantId} from ${ctx.strategy}`);
    },
    onTenantResolved: (tenant, ctx) => {
      metrics.increment('tenant.resolved', { tenant: tenant.id });
    },
    onTenantNotFound: (tenantId, ctx) => {
      logger.warn(`Tenant not found: ${tenantId}`);
    },
    onTenantMissing: (ctx) => {
      logger.debug(`No tenant in request: ${ctx.path}`);
    },
  },

  // Custom extractor function for 'custom' strategy
  customExtractor: (request) => request.headers['x-custom-header'],

  // Resolve full tenant data from ID
  tenantResolver: async (tenantId) => {
    return { id: tenantId, name: 'Tenant Name', plan: 'premium' };
  },

  // Throw error if tenant cannot be determined (default: false)
  requireTenant: false,

  // Routes to exclude from tenant extraction
  excludeRoutes: ['/health', '/api/public', /^\/docs/],
})
```

### Async Configuration

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MultiTenantModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        extractionStrategy: config.get('TENANT_STRATEGY'),
        tenantHeader: config.get('TENANT_HEADER'),
        requireTenant: config.get('REQUIRE_TENANT'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Extraction Strategies

### Header Strategy (Default)

Extract tenant ID from a request header.

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  tenantHeader: 'x-tenant-id', // default
})
```

```bash
curl -H "x-tenant-id: tenant-123" http://localhost:3000/api/users
```

### Subdomain Strategy

Extract tenant ID from the subdomain.

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'subdomain',
})
```

```
tenant-123.example.com → tenant ID: "tenant-123"
```

### Path Strategy

Extract tenant ID from a URL path segment.

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'path',
  tenantPathIndex: 0, // First path segment after /
})
```

```
/tenant-123/api/users → tenant ID: "tenant-123"
/api/tenant-123/users → tenant ID: "tenant-123" (with tenantPathIndex: 1)
```

### Query Strategy

Extract tenant ID from a query parameter.

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'query',
  tenantQueryParam: 'tenantId', // default
})
```

```
/api/users?tenantId=tenant-123 → tenant ID: "tenant-123"
```

### Cookie Strategy

Extract tenant ID from a cookie.

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'cookie',
  tenantCookie: 'tenant_id', // default
})
```

```
Cookie: tenant_id=tenant-123 → tenant ID: "tenant-123"
```

> **Note:** Works with or without `cookie-parser` middleware. If `cookie-parser` is not used, cookies are parsed from the `Cookie` header automatically.

### JWT Strategy

Extract tenant ID from a JWT token in the Authorization header.

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'jwt',
  jwtTenantClaim: 'tenantId', // default
})
```

```
Authorization: Bearer eyJhbGc... → Decodes JWT, extracts claim "tenantId"
```

**Supports nested claims with dot notation:**

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'jwt',
  jwtTenantClaim: 'user.organization.id', // nested path
})
```

```json
// JWT Payload:
{
  "user": {
    "organization": {
      "id": "tenant-123"  // ← extracted
    }
  }
}
```

> **Note:** The JWT is decoded but **not verified**. Token verification should be handled by your authentication guards (e.g., `@nestjs/passport`, `@nestjs/jwt`). This strategy trusts that tokens have already been validated.

### Bearer Token Strategy

Extract tenant ID from opaque bearer tokens (like API keys) using a resolver function.

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'bearer',
  bearerTokenResolver: async (token) => {
    // Look up API key in database to get tenant ID
    const apiKey = await this.apiKeyService.findByKey(token);
    return apiKey?.tenantId ?? null;
  },
})
```

```
Authorization: Bearer sk_live_abc123 → Calls resolver with "sk_live_abc123"
```

**Use cases:**
- API key authentication where keys are mapped to tenants
- OAuth2 opaque access tokens
- Session tokens that require database lookup

> **Note:** Unlike `jwt` strategy which decodes the token, `bearer` strategy passes the raw token to your resolver function. This is ideal for opaque tokens that require external lookup.

### Custom Strategy

Implement your own extraction logic.

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'custom',
  customExtractor: async (request) => {
    // Extract from JWT token
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.decode(token);
      return decoded?.tenantId || null;
    }
    return null;
  },
})
```

## Tenant Resolution

Enrich tenant data by providing a resolver function:

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  tenantResolver: async (tenantId: string) => {
    // Fetch from database
    const tenant = await this.tenantsRepository.findOne(tenantId);
    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.subscriptionPlan,
      settings: tenant.settings,
    };
  },
})
```

## Tenant Resolver Caching

Reduce database lookups by caching resolved tenant data:

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  tenantResolver: async (tenantId) => {
    return await this.tenantsRepository.findOne(tenantId);
  },
  tenantResolverCache: {
    enabled: true,
    ttl: 300_000,  // 5 minutes (default)
    max: 1000,     // Max cached tenants (default)
  },
})
```

### Cache Management

The middleware exposes methods for cache management:

```typescript
@Injectable()
export class TenantService {
  constructor(
    @Inject(TenantMiddleware)
    private readonly tenantMiddleware: TenantMiddleware,
  ) {}

  // Get cache statistics
  getStats() {
    return this.tenantMiddleware.getCacheStats();
    // { enabled: true, size: 42, max: 1000, ttl: 300000 }
  }

  // Invalidate a specific tenant (e.g., after update)
  onTenantUpdate(tenantId: string) {
    this.tenantMiddleware.invalidateTenant(tenantId);
  }

  // Clear entire cache
  clearAllCache() {
    this.tenantMiddleware.clearCache();
  }
}
```

### When to Use Caching

| Scenario | Recommendation |
|----------|----------------|
| High-traffic APIs | ✅ Enable with short TTL (1-5 min) |
| Tenant data rarely changes | ✅ Enable with longer TTL (10-30 min) |
| Real-time tenant updates needed | ❌ Disable or use very short TTL |
| Low-traffic internal APIs | ❌ Usually not needed |

## Event Hooks

React to tenant lifecycle events for logging, metrics, or custom logic:

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  tenantResolver: (id) => this.tenantService.findById(id),
  eventHooks: {
    // Called when tenant ID is extracted from request
    onTenantIdExtracted: (tenantId, context) => {
      console.log(`Extracted tenant: ${tenantId} via ${context.strategy}`);
    },

    // Called when tenant is successfully resolved
    onTenantResolved: (tenant, context) => {
      metrics.increment('tenant.resolved', { plan: tenant.plan });
    },

    // Called when resolver returns null
    onTenantNotFound: (tenantId, context) => {
      logger.warn(`Unknown tenant: ${tenantId} at ${context.path}`);
    },

    // Called when no tenant ID in request
    onTenantMissing: (context) => {
      logger.debug(`Anonymous request: ${context.path}`);
    },
  },
})
```

### Event Context

All hooks receive a context object:

```typescript
interface TenantEventContext {
  request: unknown;                    // The HTTP request object
  strategy: TenantExtractionStrategy;  // 'header', 'jwt', etc.
  path: string;                        // Request path
}
```

### Use Cases

| Hook | Use Case |
|------|----------|
| `onTenantIdExtracted` | Audit logging, request tracing |
| `onTenantResolved` | Metrics, feature flags per tenant |
| `onTenantNotFound` | Security alerts, invalid tenant monitoring |
| `onTenantMissing` | Analytics for anonymous traffic |
| `onTenantValidationFailed` | Security alerts, access denied logging |

## Tenant Validation

Validate tenants before allowing requests. Useful for checking subscription status, permissions, or tenant state:

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  tenantResolver: (id) => this.tenantService.findById(id),
  requireTenant: true,

  // Simple boolean validation
  tenantValidator: (tenant) => tenant.isActive === true,

  // Async validation with database check
  tenantValidator: async (tenant, ctx) => {
    const subscription = await this.subscriptionService.check(tenant.id);
    return subscription.status === 'active';
  },

  // Validation with custom error message
  tenantValidator: (tenant) => {
    if (!tenant.isActive) {
      return { valid: false, reason: 'Tenant is deactivated' };
    }
    if (tenant.subscriptionExpired) {
      return { valid: false, reason: 'Subscription expired' };
    }
    return { valid: true };
  },
})
```

### Validation Result

Return a boolean or `TenantValidationResult`:

```typescript
interface TenantValidationResult {
  valid: boolean;
  reason?: string;  // Custom error message (default: "Tenant validation failed")
}
```

### Validation Flow

```
Request → Extract ID → Resolve Tenant → Validate → Set Context → Handle Request
                                          ↓
                            If invalid & requireTenant: HTTP 403 Forbidden
                            If invalid & !requireTenant: Continue without tenant
```

### Use Cases

| Scenario | Implementation |
|----------|---------------|
| Active tenant check | `(t) => t.isActive` |
| Subscription validation | `(t) => t.subscriptionStatus === 'active'` |
| Feature flag check | `(t, ctx) => hasFeature(t, ctx.path)` |
| Rate limiting | `async (t) => await checkRateLimit(t.id)` |
| IP allowlist | `(t, ctx) => t.allowedIps.includes(getIp(ctx.request))` |

## Decorators

### @CurrentTenant()

Inject the full tenant object into a controller method.

```typescript
@Get()
findAll(@CurrentTenant() tenant: Tenant) {
  // tenant: { id: 'tenant-123', name: 'Acme Corp', ... }
}
```

### @TenantId()

Inject only the tenant ID.

```typescript
@Get()
findAll(@TenantId() tenantId: string) {
  // tenantId: 'tenant-123'
}
```

### @RequireTenant()

Mark a controller or method as requiring a valid tenant context. Use with `TenantGuard`.

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireTenant, TenantGuard } from '@lexmata/nestjs-multi-tenant';

// Apply to entire controller
@Controller('users')
@UseGuards(TenantGuard)
@RequireTenant()
export class UsersController {
  @Get()
  findAll() {
    // Guaranteed to have tenant context
  }
}

// Or apply to specific methods
@Controller('mixed')
@UseGuards(TenantGuard)
export class MixedController {
  @Get('public')
  publicEndpoint() {
    // No tenant required
  }

  @Get('private')
  @RequireTenant()
  privateEndpoint() {
    // Tenant required
  }
}
```

## TenantContextService

Access tenant information from anywhere in your application using AsyncLocalStorage.

```typescript
import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable()
export class AnyService {
  constructor(private readonly tenantContext: TenantContextService) {}

  doSomething() {
    // Get full tenant object
    const tenant = this.tenantContext.getTenant();

    // Get just the ID
    const tenantId = this.tenantContext.getTenantId();

    // Check if in tenant context
    if (this.tenantContext.hasTenant()) {
      // In tenant context
    }
  }
}
```

### Running code in a tenant context programmatically

```typescript
const tenant = { id: 'tenant-123', name: 'Test' };

tenantContext.run(tenant, () => {
  // All code here has access to the tenant context
  const id = tenantContext.getTenantId(); // 'tenant-123'
});
```

## Route Exclusions

Exclude specific routes from tenant extraction:

```typescript
MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  requireTenant: true,
  excludeRoutes: [
    '/health',           // Exact match
    '/api/public',       // Prefix match
    /^\/docs/,           // Regex match
    /^\/api\/v\d+\/public/, // Complex regex
  ],
})
```

## API Reference

### MultiTenantModuleOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `extractionStrategy` | `'header' \| 'subdomain' \| 'path' \| 'query' \| 'cookie' \| 'jwt' \| 'bearer' \| 'custom'` | `'header'` | Strategy for extracting tenant ID |
| `tenantHeader` | `string` | `'x-tenant-id'` | Header name for header strategy |
| `tenantQueryParam` | `string` | `'tenantId'` | Query param for query strategy |
| `tenantPathIndex` | `number` | `0` | Path segment index for path strategy |
| `tenantCookie` | `string` | `'tenant_id'` | Cookie name for cookie strategy |
| `jwtTenantClaim` | `string` | `'tenantId'` | JWT claim path for jwt strategy (supports dot notation) |
| `bearerTokenResolver` | `(token: string) => string \| null \| Promise<string \| null>` | `undefined` | Function to resolve tenant ID from bearer token |
| `tenantResolverCache` | `TenantCacheOptions` | `undefined` | Cache configuration for tenant resolver results |
| `tenantResolverCache.enabled` | `boolean` | `false` | Enable caching of resolved tenants |
| `tenantResolverCache.ttl` | `number` | `300000` | Cache TTL in milliseconds (5 min default) |
| `tenantResolverCache.max` | `number` | `1000` | Maximum number of cached entries |
| `eventHooks` | `TenantEventHooks` | `undefined` | Lifecycle event hooks |
| `eventHooks.onTenantIdExtracted` | `(id, ctx) => void` | `undefined` | Called when tenant ID is extracted |
| `eventHooks.onTenantResolved` | `(tenant, ctx) => void` | `undefined` | Called when tenant is resolved |
| `eventHooks.onTenantNotFound` | `(id, ctx) => void` | `undefined` | Called when tenant resolver returns null |
| `eventHooks.onTenantMissing` | `(ctx) => void` | `undefined` | Called when no tenant ID in request |
| `eventHooks.onTenantValidationFailed` | `(tenant, reason, ctx) => void` | `undefined` | Called when tenant validation fails |
| `tenantValidator` | `(tenant, ctx) => boolean \| TenantValidationResult` | `undefined` | Validate tenant before allowing request |
| `customExtractor` | `(req: Request) => string \| null \| Promise<string \| null>` | - | Custom extraction function |
| `tenantResolver` | `(id: string) => Tenant \| null \| Promise<Tenant \| null>` | - | Resolve full tenant from ID |
| `requireTenant` | `boolean` | `false` | Throw if tenant not found |
| `excludeRoutes` | `(string \| RegExp)[]` | `[]` | Routes to skip |

### Tenant Interface

```typescript
interface Tenant {
  id: string;
  name?: string;
  [key: string]: unknown;
}
```

### TenantContextService Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getTenant()` | `Tenant \| undefined` | Get current tenant |
| `getTenantId()` | `string \| undefined` | Get current tenant ID |
| `hasTenant()` | `boolean` | Check if in tenant context |
| `run(tenant, fn)` | `T` | Execute function in tenant context |

## Testing

The module is fully tested with Vitest. Run tests with:

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage
```

## Examples

### Multi-tenant Database Connection

```typescript
import { Injectable, Scope } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable({ scope: Scope.REQUEST })
export class TenantDatabaseService {
  constructor(private readonly tenantContext: TenantContextService) {}

  getConnection() {
    const tenantId = this.tenantContext.getTenantId();
    // Return tenant-specific database connection
    return this.connectionPool.get(tenantId);
  }
}
```

### Tenant-aware Repository

```typescript
import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.user.findMany({
      where: { tenantId },
    });
  }
}
```

### JWT-based Tenant Extraction

```typescript
import { JwtService } from '@nestjs/jwt';

MultiTenantModule.forRootAsync({
  imports: [JwtModule],
  useFactory: (jwt: JwtService) => ({
    extractionStrategy: 'custom',
    customExtractor: (request) => {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return null;

      try {
        const payload = jwt.verify(token);
        return payload.tenantId;
      } catch {
        return null;
      }
    },
  }),
  inject: [JwtService],
})
```

## License

MIT © [Lexmata LLC](https://github.com/Lexmata)

