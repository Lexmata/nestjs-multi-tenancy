# TODO - Project Improvement Roadmap

A comprehensive list of suggested improvements and enhancements for `@lexmata/nestjs-multi-tenant`.

## Legend

- 🔴 **High Priority** - Critical for production readiness
- 🟡 **Medium Priority** - Important for better user experience
- 🟢 **Low Priority** - Nice to have / Future enhancements

---

## 🔴 High Priority

### Release & Publishing

- [ ] **Publish v0.1.0-beta to npm registry**
  - Run `pnpm publish --access public` after setting up `NPM_TOKEN` secret
  - Verify package contents with `pnpm pack --dry-run`

- [ ] **Create GitHub Release**
  - Tag current commit as `v0.1.0-beta`
  - Generate release notes from CHANGELOG.md
  - Consider using `git-cliff` for automated changelog generation

- [x] **Add README Badges** ✅
  - npm version badge
  - CI status badge
  - Test coverage badge (Codecov)
  - License badge
  - npm downloads badge
  - Node.js version badge
  - NestJS compatibility badge
  - TypeScript badge

### Security & Quality

- [x] **Add CodeQL Security Scanning** ✅
  - Created `.github/workflows/codeql.yml`
  - JavaScript/TypeScript analysis enabled
  - Runs on push, PR, and weekly schedule
  - Uses security-extended and security-and-quality queries

- [x] **Set up Codecov Integration** ✅
  - CI workflow already uploads coverage
  - Created `codecov.yml` configuration file
  - 90% project coverage target, 80% patch target
  - Component-level coverage tracking
  - Note: Add `CODECOV_TOKEN` secret to repository

- [x] **Add SNYK or npm audit to CI** ✅
  - Added `pnpm audit` to CI workflow
  - Fails on high/critical vulnerabilities (all deps)
  - Fails on moderate+ vulnerabilities (production deps only)

---

## 🟡 Medium Priority

### New Extraction Strategies

- [x] **Cookie-based Tenant Extraction** ✅
  ```typescript
  extractionStrategy: 'cookie',
  tenantCookie: 'tenant_id',
  ```
  - Works with or without cookie-parser middleware
  - Auto-parses Cookie header as fallback
  - Handles cookies with `=` in values

- [x] **JWT-based Tenant Extraction** ✅
  ```typescript
  extractionStrategy: 'jwt',
  jwtTenantClaim: 'tenantId', // defaults to 'tenantId'
  ```
  - Auto-extract tenant from JWT payload (decodes without verification)
  - Supports nested claim paths with dot notation (e.g., `user.organization.id`)
  - Auth guards should handle JWT verification

- [x] **Bearer Token Tenant Extraction** ✅
  ```typescript
  extractionStrategy: 'bearer',
  bearerTokenResolver: async (token) => {
    const apiKey = await apiKeyService.findByKey(token);
    return apiKey?.tenantId ?? null;
  },
  ```
  - For opaque tokens like API keys that need database lookup
  - Supports sync and async resolver functions

- [x] **Tenant Resolver Caching** ✅
  ```typescript
  tenantResolverCache: {
    enabled: true,
    ttl: 300_000,  // 5 minutes
    max: 1000,     // Max entries
  },
  ```
  - In-memory cache with TTL support
  - LRU eviction when cache is full
  - Cache management: `clearCache()`, `invalidateTenant()`, `getCacheStats()`

- [x] **Event Hooks & Lifecycle Events** ✅
  ```typescript
  eventHooks: {
    onTenantIdExtracted: (id, ctx) => logger.debug(`Extracted: ${id}`),
    onTenantResolved: (tenant, ctx) => metrics.inc('resolved'),
    onTenantNotFound: (id, ctx) => logger.warn(`Not found: ${id}`),
    onTenantMissing: (ctx) => logger.debug('Anonymous request'),
    onTenantValidationFailed: (tenant, reason, ctx) => logger.warn(`Validation failed: ${reason}`),
  },
  ```
  - Full lifecycle visibility for logging, metrics, alerts
  - Async hooks supported

- [x] **Tenant Validation Hook** ✅
  ```typescript
  tenantValidator: (tenant, ctx) => {
    if (!tenant.isActive) return { valid: false, reason: 'Tenant deactivated' };
    if (tenant.subscriptionExpired) return { valid: false, reason: 'Subscription expired' };
    return true;
  },
  ```
  - Validate tenants before allowing requests
  - Custom error messages via `TenantValidationResult`
  - Async validation supported
  - Returns HTTP 403 when validation fails and `requireTenant: true`

- [x] **Debug/Logging Mode** ✅
  ```typescript
  MultiTenantModule.forRoot({
    debug: true, // Enable detailed logging
  })
  ```
  - Logs initialization settings (strategy, cache config)
  - Logs extraction process per request
  - Logs cache hits/misses
  - Logs validation results
  - Uses NestJS Logger with `[MultiTenant]` context

- [x] **GraphQL Support** ✅
  ```typescript
  @Resolver(() => User)
  @UseGuards(TenantGuard)
  @RequireTenant()
  export class UsersResolver {
    @Query(() => [User])
    users(@CurrentTenant() tenant: Tenant) {
      return this.userService.findByTenant(tenant.id);
    }
  }
  ```
  - `@CurrentTenant()` and `@TenantId()` work with resolvers
  - `TenantGuard` supports GraphQL context
  - Automatic HTTP/GraphQL context detection
  - No hard dependency on `@nestjs/graphql`

- [x] **WebSocket Support** ✅
  ```typescript
  @WebSocketGateway()
  @UseGuards(TenantGuard)
  @RequireTenant()
  export class ChatGateway {
    @SubscribeMessage('message')
    handleMessage(@CurrentTenant() tenant: Tenant, @MessageBody() data: string) {
      return this.chatService.broadcast(tenant.id, data);
    }
  }
  ```
  - `@CurrentTenant()` and `@TenantId()` work with WebSocket gateways
  - `TenantGuard` supports WebSocket context
  - Extracts tenant from `client.tenant`, `client.handshake.tenant`, or `client.data.tenant`
  - WebSocket-specific error messages

- [x] **Bearer Token Tenant Extraction** ✅
  - Extract tenant from opaque bearer tokens via callback
  - Support API key-based tenant identification

### Core Features

- [x] **Tenant Resolver Caching** ✅
  ```typescript
  MultiTenantModule.forRoot({
    tenantResolver: async (id) => fetchTenant(id),
    tenantResolverCache: {
      enabled: true,
      ttl: 300000, // milliseconds
      max: 1000,
    },
  })
  ```
  - In-memory LRU cache by default
  - Configurable TTL and max size
  - Cache invalidation methods: `clearCache()`, `invalidateTenant(id)`, `getCacheStats()`

- [x] **Event Hooks / Lifecycle Events** ✅
  ```typescript
  eventHooks: {
    onTenantIdExtracted?: (tenantId: string, ctx: TenantEventContext) => void | Promise<void>;
    onTenantResolved?: (tenant: Tenant, ctx: TenantEventContext) => void | Promise<void>;
    onTenantNotFound?: (tenantId: string, ctx: TenantEventContext) => void | Promise<void>;
    onTenantMissing?: (ctx: TenantEventContext) => void | Promise<void>;
    onTenantValidationFailed?: (tenant: Tenant, reason: string, ctx: TenantEventContext) => void | Promise<void>;
  }
  ```
  - All hooks receive context with request, strategy, and path
  - Supports both sync and async hooks
  - Allow logging, metrics collection, audit trails

- [x] **Tenant Validation Hook** ✅
  ```typescript
  tenantValidator?: (tenant: Tenant, ctx: TenantEventContext) => boolean | TenantValidationResult | Promise<boolean | TenantValidationResult>;
  ```
  - Reject requests with invalid/suspended tenants
  - Support async validation (e.g., check subscription status)
  - Return `{ valid: false, reason: 'message' }` for custom error messages

- [x] **Debug/Logging Mode** ✅
  ```typescript
  MultiTenantModule.forRoot({
    debug: true,
  })
  ```
  - Logs extraction strategy, tenant ID, resolution, caching, and validation
  - Uses NestJS Logger with `[MultiTenant]` context
  - Shows HTTP method and path for each request
  - Integration with NestJS Logger

### Ecosystem Integration

- [x] **GraphQL Support** ✅
  - `@CurrentTenant()` and `@TenantId()` decorators work with GraphQL resolvers
  - `TenantGuard` works with GraphQL execution context
  - Automatic context detection (HTTP vs GraphQL)
  - No hard dependency on `@nestjs/graphql` (graceful fallback)
  ```typescript
  @Resolver(() => User)
  @UseGuards(TenantGuard)
  @RequireTenant()
  export class UsersResolver {
    @Query(() => [User])
    users(@CurrentTenant() tenant: Tenant) {
      return this.usersService.findByTenant(tenant.id);
    }
  }
  ```

- [x] **WebSocket Support** ✅
  - `@CurrentTenant()` and `@TenantId()` decorators work with WebSocket gateways
  - `TenantGuard` works with WebSocket execution context
  - Extracts tenant from `client.tenant`, `client.handshake.tenant`, or `client.data.tenant`
  - WebSocket-specific error messages

- [x] **Microservices Support** ✅
  - Propagate tenant context across service boundaries
  - Support for message patterns (TCP, Redis, NATS, etc.)
  - Add tenant ID to message metadata

- [x] **Fastify Adapter Support** ✅
  - Platform-agnostic middleware (works with Express and Fastify)
  - Abstracted request path and hostname access
  - No Fastify-specific registration needed - uses standard NestJS middleware

### Testing

- [x] **Integration Tests with Real NestJS App** ✅
  - Created `test/e2e/` directory with 22 integration tests
  - Tests full request lifecycle with real NestJS application
  - Tests header, query, path, and cookie extraction strategies
  - Tests tenant resolver, caching, event hooks, validation, and debug mode
  - Uses supertest for HTTP testing
  - Test async configuration
  - Test route exclusions

- [x] **Test Utilities Export** ✅
  - Created `src/testing/index.ts` with testing utilities
  - `MockTenantContextService` - mock implementation for testing
  - `createMockTenantContext()` - factory for mock context
  - `createMockRequest()` - create request with tenant attached
  - `createMockExecutionContext()` - mock ExecutionContext for guards/decorators
  - `createTestTenant()` / `createTestTenants()` - helpers for creating test data
  - Exported as `@lexmata/nestjs-multi-tenant/testing` subpath

- [ ] **Performance Benchmarks**
  - Measure middleware overhead
  - Compare extraction strategies
  - Benchmark with/without caching
  - Publish results in docs

- [ ] **Add Test Utilities Export**
  ```typescript
  import { createMockTenantContext } from '@lexmata/nestjs-multi-tenant/testing';

  const mockContext = createMockTenantContext({ id: 'test-tenant' });
  ```
  - Mock TenantContextService for unit tests
  - Test helpers for common scenarios

---

## 🟢 Low Priority

### Documentation Site Enhancements

- [ ] **Add Search Functionality**
  - Integrate Algolia DocSearch or local search
  - Index all documentation pages
  - Keyboard shortcut (Cmd/Ctrl+K)

- [ ] **Interactive Examples / Playground**
  - Embedded code editor (CodeSandbox/StackBlitz)
  - Live preview of configurations
  - Try different extraction strategies

- [ ] **Version Selector**
  - Support multiple documentation versions
  - Link to specific version changelogs
  - Migration guides between versions

- [ ] **Dark/Light Theme Toggle**
  - User preference persistence
  - System preference detection
  - Smooth transition animation

- [x] **API Reference Page** ✅
  - Auto-generated from TypeScript source using TypeDoc
  - JSON output parsed by Angular component at `/api` route
  - Interactive type explorer with search, category filters
  - Expandable items showing parameters, properties, methods
  - Source links to GitHub
  - `pnpm run docs:api` script to regenerate API docs

- [ ] **Add Troubleshooting Guide**
  - Common issues and solutions
  - FAQ section
  - Debugging tips

### Advanced Features

- [ ] **Multi-Database Tenant Isolation**
  ```typescript
  getDatabaseConnectionForTenant(tenantId: string): DataSource
  ```
  - Support database-per-tenant pattern
  - Connection pooling per tenant
  - Schema-per-tenant support

- [ ] **Tenant-Scoped Providers**
  ```typescript
  @TenantScoped()
  @Injectable()
  export class TenantSpecificService {
    // Instance per tenant
  }
  ```
  - Lazy initialization per tenant
  - Resource cleanup on tenant context end

- [ ] **Request Tenant Override**
  ```typescript
  @Get('admin/impersonate/:tenantId')
  @OverrideTenant()
  impersonate(@Param('tenantId') tenantId: string) {
    // Run as different tenant (admin use case)
  }
  ```
  - Admin/superuser impersonation
  - Audit logging for impersonation

- [ ] **Tenant Hierarchy Support**
  ```typescript
  interface Tenant {
    id: string;
    parentId?: string; // For hierarchical tenants
    hierarchy?: string[]; // Ancestor chain
  }
  ```
  - Parent/child tenant relationships
  - Inherited permissions/settings

### Developer Experience

- [x] **ESLint Plugin** ✅
  - `require-tenant-guard`: Warns when TenantContextService used without guard
  - `require-tenant-decorator`: Detects missing @RequireTenant() on routes using @CurrentTenant/@TenantId
  - Auto-fix suggestions for both rules
  - Exported as `@lexmata/nestjs-multi-tenant/eslint-plugin`
  - Includes `recommended` and `strict` configs

- [x] **NestJS CLI Plugin/Schematic** ✅
  ```bash
  nest g @lexmata/nestjs-multi-tenant:tenant-module users
  nest g @lexmata/nestjs-multi-tenant:tenant-service billing
  ```
  - `tenant-module`: Generates complete tenant-aware module with controller, service, and tests
  - `tenant-service`: Generates standalone tenant-aware service
  - Includes CRUD operations with tenant filtering
  - Auto-generates test files with proper mocks

- [ ] **VS Code Extension**
  - Syntax highlighting for tenant decorators
  - Quick actions for common patterns
  - Tenant context debugging

### Infrastructure & CI/CD

- [ ] **Add Semantic Release**
  - Automated version bumping
  - Changelog generation
  - npm publishing on merge to main

- [ ] **Add Renovate as Alternative to Dependabot**
  - More configurable than Dependabot
  - Better monorepo support
  - Auto-merge for patch updates

- [ ] **Add GitHub Discussions**
  - Q&A category for support
  - Ideas category for feature requests
  - Show off category for community projects

- [ ] **Docker Development Environment**
  - `docker-compose.yml` for local development
  - Database containers for integration tests
  - Documentation server container

### Additional ORM Examples

- [ ] **Sequelize Multi-Tenancy Example**
  - Sequelize hooks for tenant filtering
  - Dynamic schema switching

- [ ] **Mongoose Multi-Tenancy Example**
  - MongoDB multi-tenancy patterns
  - Tenant-aware model factories

- [ ] **Knex.js Multi-Tenancy Example**
  - Query builder with automatic tenant filtering
  - Migration per tenant

### Community & Ecosystem

- [ ] **Create Example Projects Repository**
  - `examples/basic-header-strategy/`
  - `examples/prisma-multi-db/`
  - `examples/microservices/`
  - `examples/graphql-federation/`

- [ ] **Add to NestJS Ecosystem**
  - Submit to awesome-nestjs list
  - NestJS Discord announcement
  - Blog post on dev.to/Medium

- [ ] **Sponsor & Support Links**
  - GitHub Sponsors setup
  - Open Collective setup
  - Ko-fi/Buy Me a Coffee

---

## Completed ✅

- [x] ~~Core module with forRoot/forRootAsync~~
- [x] ~~Header, subdomain, path, query extraction strategies~~
- [x] ~~Custom extractor support~~
- [x] ~~TenantContextService with AsyncLocalStorage~~
- [x] ~~@CurrentTenant, @TenantId, @RequireTenant decorators~~
- [x] ~~TenantGuard for route protection~~
- [x] ~~Route exclusion patterns~~
- [x] ~~Tenant resolver function~~
- [x] ~~89 unit tests with 100% coverage~~
- [x] ~~GitHub Pages documentation site~~
- [x] ~~CI/CD workflows (lint, test, release, docs)~~
- [x] ~~Prisma 7 integration example~~
- [x] ~~TypeORM integration example~~
- [x] ~~Drizzle ORM integration example~~
- [x] ~~MikroORM integration example~~
- [x] ~~Dependabot configuration~~
- [x] ~~CHANGELOG.md~~
- [x] ~~CONTRIBUTING.md~~

---

## Notes

- Priorities may shift based on community feedback and issue reports
- Breaking changes should be avoided until v1.0.0
- All new features should include tests and documentation
- Consider backward compatibility when adding new options

---

*Last updated: December 17, 2025*

