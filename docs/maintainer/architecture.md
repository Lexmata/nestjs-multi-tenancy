# Internal Architecture

This document describes the internal structure of `@lexmata/nestjs-multi-tenant` for
maintainers. For consumer-facing documentation, see the [README](../../README.md) or
the [hosted docs](https://lexmata.github.io/nestjs-multi-tenancy/).

## Module Structure

```
src/
  index.ts                          # Public API barrel export
  constants.ts                      # Injection tokens and defaults
  multi-tenant.module.ts            # NestJS dynamic module definition
  interfaces/
    tenant.interface.ts             # All public types (Tenant, options, hooks, etc.)
  middleware/
    tenant.middleware.ts            # Core request pipeline (extraction -> resolution -> validation -> context)
  services/
    tenant-context.service.ts       # AsyncLocalStorage-based tenant context
  guards/
    tenant.guard.ts                 # CanActivate guard for @RequireTenant()
  decorators/
    tenant.decorator.ts             # @CurrentTenant() and @TenantId() param decorators
    require-tenant.decorator.ts     # @RequireTenant() metadata decorator
  testing/
    index.ts                        # MockTenantContextService, test helpers
  eslint-plugin/
    index.ts                        # ESLint plugin entry (recommended + strict configs)
    rules/
      require-tenant-guard.ts       # Warns when TenantContextService is used without guard
      require-tenant-decorator.ts   # Detects missing @RequireTenant() on controller methods
schematics/
  collection.json                   # Angular CLI schematic collection
  tenant-module/                    # `ng g @lexmata/nestjs-multi-tenant:tenant-module`
  tenant-service/                   # `ng g @lexmata/nestjs-multi-tenant:tenant-service`
test/
  e2e/
    multi-tenant.e2e.spec.ts        # Full request lifecycle integration tests
```

## How the Module Registers Into NestJS

`MultiTenantModule` is a standard NestJS dynamic module. Both `forRoot()` and
`forRootAsync()` return a `DynamicModule` marked `global: true`, so consumers import
it once in their root module and the providers are available everywhere.

### Providers Registered

| Provider               | Scope    | Purpose                                              |
|------------------------|----------|------------------------------------------------------|
| `MULTI_TENANT_OPTIONS` | Singleton | Injection token holding the consumer's config object |
| `TenantContextService` | Singleton | AsyncLocalStorage wrapper for tenant context         |
| `TenantMiddleware`     | Singleton | The core extraction/resolution/validation pipeline   |
| `TenantGuard`          | Singleton | CanActivate guard for `@RequireTenant()`             |

All four are also exported, so consuming modules can inject them (e.g., to call
`TenantMiddleware.invalidateTenant()` for cache management).

### Middleware Registration

`MultiTenantModule` implements `NestModule.configure()` and applies
`TenantMiddleware` to `forRoutes('*')`. This means the middleware runs on every
incoming HTTP request before any guards, interceptors, or handlers execute. Route
exclusions are handled inside the middleware itself, not at the NestJS routing level.

```
NestModule.configure() -> consumer.apply(TenantMiddleware).forRoutes('*')
```

## Tenant Extraction Pipeline

The middleware (`TenantMiddleware.use()`) is the heart of the library. Every HTTP
request flows through this pipeline:

```
Incoming Request
      |
      v
  Is route excluded?  ----yes----> next() (skip entirely)
      |
      no
      |
      v
  Extract tenant ID (strategy-specific)
      |
      v
  Tenant ID found?  ----no----> fire onTenantMissing hook
      |                              |
      yes                       requireTenant?
      |                         yes -> throw 400
      v                         no  -> next()
  Fire onTenantIdExtracted hook
      |
      v
  tenantResolver configured?
      |
      yes -> resolve(tenantId) with optional cache
      |          |
      |      resolved? ----no----> fire onTenantNotFound hook
      |          |                      |
      |          yes              requireTenant?
      |          |                yes -> throw 404
      |          v                no  -> next()
      no -> tenant = { id: tenantId }
      |
      v
  tenantValidator configured?
      |
      yes -> validate(tenant, context)
      |          |
      |      valid? ----no----> fire onTenantValidationFailed hook
      |          |                   |
      |          yes            requireTenant?
      |          |              yes -> throw 403
      |          v              no  -> next()
      no
      |
      v
  Fire onTenantResolved hook
      |
      v
  Attach tenant to request object (req.tenant = tenant)
      |
      v
  TenantContextService.run(tenant, () => next())
```

### Extraction Strategies

Each strategy is a private method on `TenantMiddleware`. The `extractTenantId()`
method dispatches based on `options.extractionStrategy` (default: `'header'`).

| Strategy    | Method                    | Source                                          |
|-------------|---------------------------|-------------------------------------------------|
| `header`    | `extractFromHeader()`     | `req.headers[tenantHeader]`                     |
| `subdomain` | `extractFromSubdomain()`  | First part of `req.hostname` (e.g. `acme.example.com` -> `acme`) |
| `path`      | `extractFromPath()`       | URL path segment at `tenantPathIndex`           |
| `query`     | `extractFromQuery()`      | `req.query[tenantQueryParam]`                   |
| `cookie`    | `extractFromCookie()`     | `req.cookies[tenantCookie]` or manual header parse |
| `jwt`       | `extractFromJwt()`        | Decodes JWT from `Authorization: Bearer ...`, reads claim at `jwtTenantClaim` (supports dot notation) |
| `bearer`    | `extractFromBearer()`     | Passes raw token to `bearerTokenResolver()` function |
| `custom`    | `extractCustom()`         | Calls consumer's `customExtractor(request)` function |

The JWT strategy decodes the token **without verification**. This is intentional --
token verification is handled by the consuming application's auth guards (e.g.,
`@nestjs/passport`). The middleware only needs to read the tenant claim.

### Platform Abstraction

The middleware uses a `PlatformRequest` interface that abstracts over Express and
Fastify differences:

- **Path resolution:** Express uses `req.path`; Fastify uses `req.url` (with query
  string stripped). `getRequestPath()` handles both.
- **Hostname resolution:** Both platforms support `req.hostname`, with a fallback to
  the `Host` header.
- **Cookie parsing:** If `req.cookies` is not populated (no cookie-parser middleware),
  the middleware manually parses the `Cookie` header.

## AsyncLocalStorage Context

`TenantContextService` wraps Node.js `AsyncLocalStorage<Tenant>`. The middleware calls
`this.tenantContext.run(tenant, () => next())`, which means:

1. The tenant is stored in the async local storage for the duration of the request.
2. Any code running in that async context (services, repositories, etc.) can call
   `tenantContext.getTenant()` or `tenantContext.getTenantId()` to retrieve it.
3. The storage is automatically cleaned up when the request completes -- there is no
   explicit teardown needed.

This design avoids `REQUEST`-scoped providers and the performance overhead they bring.
The `TenantContextService` itself is a singleton.

### How Decorators Read Tenant

The `@CurrentTenant()` and `@TenantId()` param decorators do **not** use
`TenantContextService`. They read `req.tenant` directly from the request object
(which the middleware sets at line 174 of `tenant.middleware.ts`). This is because
NestJS param decorators receive the `ExecutionContext`, and it is simpler and more
reliable to read from the request object than to inject a service into a decorator.

The decorator also handles four execution context types:

| Context Type | How tenant is retrieved                                             |
|-------------|----------------------------------------------------------------------|
| `http`      | `ctx.switchToHttp().getRequest().tenant`                            |
| `graphql`   | `GqlExecutionContext.create(ctx).getContext().req.tenant` (dynamic require, no hard dependency on `@nestjs/graphql`) |
| `ws`        | Checks `client.tenant`, `client.handshake.tenant`, `client.data.tenant` in order |
| `rpc`       | Checks `data.tenant`, `data.tenantId` (wrapped), `context.tenant`, `context.getTenant()` |

## Guard System

`TenantGuard` is a standard NestJS `CanActivate` guard. It uses `Reflector` to check
for the `REQUIRE_TENANT_KEY` metadata (set by `@RequireTenant()`).

Flow:
1. If `@RequireTenant()` metadata is not present on the handler or class, the guard
   allows the request (returns `true`).
2. If metadata is present, the guard calls `TenantContextService.hasTenant()`.
3. If no tenant context exists, it throws `HttpException` with `403 FORBIDDEN` and a
   context-type-specific error message (different messages for HTTP, GraphQL, WS, RPC).

The guard checks both handler-level and class-level metadata via
`reflector.getAllAndOverride()`, so `@RequireTenant()` can be applied at either level.

## Tenant Resolver Cache

The middleware implements an in-memory LRU-style cache for tenant resolution results.
This is a simple `Map<string, CacheEntry>` with TTL-based expiration.

- **Cache key:** tenant ID string
- **Cache entry:** `{ tenant: Tenant, expiresAt: number }`
- **Eviction:** When the cache reaches `max` size, the oldest entry (first map key) is
  deleted before inserting a new one. Expired entries are deleted on read.
- **Public API:** `clearCache()`, `invalidateTenant(tenantId)`, `getCacheStats()`

This cache is intentionally simple. It does not use `lru-cache` or any external
dependency because the library has zero runtime dependencies (peer dependencies only).
For production workloads with high cardinality, consumers should implement their own
caching in the `tenantResolver` function.

## Event Hook System

Event hooks are optional callbacks on the `MultiTenantModuleOptions.eventHooks` object.
The middleware fires them at specific points in the pipeline:

| Hook                        | When                                           | Arguments                     |
|-----------------------------|------------------------------------------------|-------------------------------|
| `onTenantIdExtracted`       | After ID extracted, before resolution          | `(tenantId, context)`         |
| `onTenantResolved`          | After successful resolution + validation       | `(tenant, context)`           |
| `onTenantNotFound`          | After resolver returned null                   | `(tenantId, context)`         |
| `onTenantMissing`           | When no tenant ID could be extracted           | `(context)`                   |
| `onTenantValidationFailed`  | After validator rejected the tenant            | `(tenant, reason, context)`   |

All hooks receive a `TenantEventContext` containing the raw request, the extraction
strategy name, and the request path. Hooks are awaited (they can be async).

Hooks are fire-and-forget from the consumer's perspective -- if a hook throws, it
propagates up and the request fails. This is intentional: if your metrics/logging hook
is broken, you want to know about it rather than silently swallowing errors.

## ESLint Plugin

The library ships an ESLint plugin at `@lexmata/nestjs-multi-tenant/eslint-plugin`
with two rules:

### `require-tenant-guard`

Warns when a class injects `TenantContextService` and calls `getTenant()`,
`getTenantId()`, or `hasTenant()` but the class does not have `@UseGuards(TenantGuard)`
or `@RequireTenant()` decorators. This catches the common mistake of reading tenant
context without ensuring the guard has validated it.

### `require-tenant-decorator`

Detects controller methods that use `@CurrentTenant()` or `@TenantId()` parameter
decorators but do not have `@RequireTenant()` on the method or class. This ensures
every method that reads tenant data has explicitly opted into requiring it.

Both rules support configuration options (exempt methods, etc.) and ship with
`recommended` (warn) and `strict` (error) presets.

## Schematics

The library provides two Angular CLI schematics for scaffolding tenant-aware code:

- `tenant-module`: Generates a NestJS module with a controller and service that use
  `@CurrentTenant()`, `@RequireTenant()`, and `TenantContextService`.
- `tenant-service`: Generates a service that injects `TenantContextService` with
  tenant-scoped query methods.

These use Angular DevKit's schematic infrastructure and are compiled separately
(`schematics/tsconfig.json`).

## Testing Architecture

### Unit Tests (Co-located)

Each source file has a co-located `.spec.ts` file. These test individual components
in isolation:

- `constants.spec.ts` -- verifies default values and token string stability
- `multi-tenant.module.spec.ts` -- tests `forRoot()` and `forRootAsync()` provider registration
- `middleware/tenant.middleware.spec.ts` -- tests all 8 extraction strategies, caching,
  event hooks, validation, route exclusions, debug logging, and error handling (this is
  the largest test file at ~80KB)
- `services/tenant-context.service.spec.ts` -- tests AsyncLocalStorage behavior
- `guards/tenant.guard.spec.ts` -- tests metadata reflection and context-type error messages
- `decorators/tenant.decorator.spec.ts` -- tests all 4 execution context types
- `decorators/require-tenant.decorator.spec.ts` -- tests metadata application
- `testing/index.spec.ts` -- tests the test utilities themselves
- `eslint-plugin/index.spec.ts` -- tests plugin structure
- `eslint-plugin/rules/*.spec.ts` -- tests each ESLint rule with `@typescript-eslint/rule-tester`

### E2E Tests

`test/e2e/multi-tenant.e2e.spec.ts` boots a real NestJS application with `supertest`
and exercises the full request lifecycle. Due to NestJS testing module limitations with
middleware DI, the E2E tests manually apply the middleware using Express middleware
functions rather than relying on `NestModule.configure()`.

### Test Runner

All tests use Vitest with the following configuration:

- `globals: true` -- no need to import `describe`/`it`/`expect`
- `environment: 'node'` -- no browser emulation
- Coverage via `@vitest/coverage-v8` with text, JSON, HTML, and LCOV reporters
- Coverage excludes `*.spec.ts` files and barrel `index.ts` files

### CI Matrix

The CI workflow tests against Node.js 20 and 22, ensuring compatibility across the
supported engine range (`"node": ">=20.0.0"`).

## Build and Publish Pipeline

### Build

`pnpm build` runs two TypeScript compilations:
1. `tsc` -- compiles `src/` to `dist/` (library code)
2. `tsc -p schematics/tsconfig.json` -- compiles schematics separately

### Package Contents

The `files` field in `package.json` limits the published package to:
- `dist/` -- compiled library code
- `schematics/` -- Angular CLI schematics
- `README.md`
- `LICENSE`

### Exports Map

The package uses the `exports` field for subpath exports:

| Import path                                  | Resolves to                      |
|----------------------------------------------|----------------------------------|
| `@lexmata/nestjs-multi-tenant`               | `dist/index.js`                  |
| `@lexmata/nestjs-multi-tenant/testing`       | `dist/testing/index.js`          |
| `@lexmata/nestjs-multi-tenant/eslint-plugin` | `dist/eslint-plugin/index.js`    |

### Release

Releases are triggered by pushing a git tag matching `v*`. The `release.yml` GitHub
Actions workflow:
1. Installs dependencies, runs tests, builds
2. Publishes to npm with `pnpm publish --access public --no-git-checks`
3. Generates a changelog with `git-cliff` (if `cliff.toml` exists)
4. Creates a GitHub Release with auto-generated release notes

The `prepublishOnly` script in `package.json` also runs lint + test + build as a
safety net. The `postversion` script pushes the version commit and tags automatically.
