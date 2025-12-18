# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Cookie-based Tenant Extraction**: New `cookie` extraction strategy
  - Configure with `extractionStrategy: 'cookie'` and `tenantCookie: 'cookie_name'`
  - Works with or without `cookie-parser` middleware
  - Automatically parses `Cookie` header as fallback
  - Handles cookies with `=` characters in values

- **JWT-based Tenant Extraction**: New `jwt` extraction strategy
  - Configure with `extractionStrategy: 'jwt'` and `jwtTenantClaim: 'claim_path'`
  - Extracts tenant ID from JWT tokens in Authorization header
  - Supports nested claims with dot notation (e.g., `user.organization.id`)
  - Decodes without verification (auth guards should handle verification)
  - Handles both `Bearer` and `bearer` prefixes

- **Bearer Token Tenant Extraction**: New `bearer` extraction strategy
  - Configure with `extractionStrategy: 'bearer'` and `bearerTokenResolver: (token) => tenantId`
  - For opaque tokens like API keys that require database lookup
  - Supports sync and async resolver functions
  - Ideal for API key authentication where keys map to tenants

- **Tenant Resolver Caching**: Cache resolved tenant data to reduce database lookups
  - Configure with `tenantResolverCache: { enabled: true, ttl: 300000, max: 1000 }`
  - Configurable TTL (time-to-live) and max cache size
  - Simple LRU eviction when cache is full
  - Automatic expiration of stale entries
  - Cache management methods: `clearCache()`, `invalidateTenant()`, `getCacheStats()`

- **Event Hooks & Lifecycle Events**: React to tenant extraction lifecycle
  - `onTenantIdExtracted`: Called when tenant ID is extracted from request
  - `onTenantResolved`: Called when tenant is successfully resolved
  - `onTenantNotFound`: Called when tenant resolver returns null
  - `onTenantMissing`: Called when no tenant ID in request
  - `onTenantValidationFailed`: Called when tenant validation fails
  - All hooks receive context with request, strategy, and path
  - Supports both sync and async hooks

- **Tenant Validation Hook**: Validate tenants before allowing requests
  - Configure with `tenantValidator: (tenant, ctx) => boolean | TenantValidationResult`
  - Return `{ valid: false, reason: 'Custom message' }` for custom error messages
  - Async validation supported
  - Integrates with `requireTenant` option (returns 403 Forbidden when invalid)

- **Debug/Logging Mode**: Enable detailed logging for troubleshooting
  - Configure with `debug: true`
  - Logs extraction strategy, tenant ID, resolution, caching, and validation
  - Uses NestJS Logger with `[MultiTenant]` context
  - Shows HTTP method and path for each request

- **GraphQL Support**: Full support for GraphQL resolvers
  - `@CurrentTenant()` and `@TenantId()` decorators work with GraphQL resolvers
  - `TenantGuard` works with GraphQL execution context
  - Automatic context detection (HTTP vs GraphQL)
  - No hard dependency on `@nestjs/graphql` (graceful fallback)

- **WebSocket Support**: Full support for WebSocket gateways
  - `@CurrentTenant()` and `@TenantId()` decorators work with WebSocket gateways
  - `TenantGuard` works with WebSocket execution context
  - Extracts tenant from `client.tenant`, `client.handshake.tenant`, or `client.data.tenant`
  - WebSocket-specific error messages

- **Microservice Support**: Full support for NestJS microservices (TCP, Redis, RabbitMQ, Kafka, gRPC, etc.)
  - `@CurrentTenant()` and `@TenantId()` decorators work with message handlers
  - `TenantGuard` works with RPC execution context
  - Extracts tenant from message payload (`data.tenant`, `data.tenantId`) or RPC context
  - Supports custom context getters (`context.getTenant()`)
  - Microservice-specific error messages
  - Works with `@MessagePattern()` and `@EventPattern()` handlers

- **Fastify Adapter Support**: Works seamlessly with both Express and Fastify
  - Platform-agnostic middleware implementation
  - Abstracted request path and hostname access
  - No additional configuration required for Fastify

### Changed

- Test suite expanded from 89 to 217 tests

## [0.1.0-beta] - 2025-12-17

### Added

- **Core Module**: `MultiTenantModule` with `forRoot()` and `forRootAsync()` configuration
- **Extraction Strategies**: Support for multiple tenant identification methods
  - Header-based extraction (`x-tenant-id` header)
  - Subdomain-based extraction
  - Path-based extraction
  - Query parameter extraction
  - Custom extractor function support
- **Decorators**:
  - `@CurrentTenant()` - Inject full tenant object into route handlers
  - `@TenantId()` - Inject just the tenant ID string
  - `@RequireTenant()` - Mark routes/controllers as requiring tenant context
- **Guards**: `TenantGuard` for protecting routes that require tenant context
- **Services**: `TenantContextService` for programmatic access to tenant context
  - `getTenant()` - Get full tenant object
  - `getTenantId()` - Get tenant ID
  - `hasTenant()` - Check if in tenant context
  - `run()` - Execute code within a tenant context
- **Middleware**: Automatic tenant extraction middleware
- **Configuration Options**:
  - `tenantResolver` - Async function to resolve full tenant data from ID
  - `requireTenant` - Global setting to require tenant on all routes
  - `excludeRoutes` - Routes to exclude from tenant extraction (strings or regex)
- **Documentation**: GitHub Pages documentation site with NestJS-style theme
- **CI/CD**: GitHub Actions workflows for testing and documentation deployment
- **Developer Experience**:
  - Husky git hooks with commitlint
  - ESLint and Prettier configuration
  - Vitest test suite with 89 tests

### Technical Details

- Built for NestJS 10.x and 11.x
- Uses `AsyncLocalStorage` for request-scoped tenant context
- TypeScript with strict mode enabled
- Zero external runtime dependencies (peer deps only)

[Unreleased]: https://github.com/Lexmata/nestjs-multi-tenancy/compare/v0.1.0-beta...HEAD
[0.1.0-beta]: https://github.com/Lexmata/nestjs-multi-tenancy/releases/tag/v0.1.0-beta

