# Troubleshooting

Common issues encountered when developing or consuming `@lexmata/nestjs-multi-tenant`,
and how to diagnose them.

## Tenant Not Resolving (undefined everywhere)

**Symptom:** `@CurrentTenant()` returns `undefined`, `TenantContextService.getTenant()`
returns `undefined`, but you are sending the tenant header.

### Check 1: Is the module imported?

The module must be imported in your root `AppModule`. Verify it is present:

```typescript
@Module({
  imports: [
    MultiTenantModule.forRoot({ ... }),
    // or MultiTenantModule.forRootAsync({ ... }),
  ],
})
export class AppModule {}
```

If you imported it in a feature module instead of the root, the middleware will not be
registered because `NestModule.configure()` only runs on the root module's middleware
consumer.

### Check 2: Is the header name correct?

The default header is `x-tenant-id` (lowercase). HTTP headers are case-insensitive,
but the middleware reads them via `req.headers[headerName.toLowerCase()]`. Verify:

- Your client sends the header with the exact name you configured (or `x-tenant-id` if
  using the default).
- If you are behind a reverse proxy (nginx, ALB, CloudFront), verify the proxy is not
  stripping the header. Add it to the allowed/forwarded headers list.

### Check 3: Is the route excluded?

If you configured `excludeRoutes`, the middleware skips tenant extraction entirely for
matching paths. The matching logic is:

- String patterns: exact match **or prefix match** (e.g., `'/api/public'` matches
  `/api/public/anything`).
- RegExp patterns: tested with `.test(path)`.

Enable debug mode (`debug: true`) to see which routes are being excluded.

### Check 4: Enable debug mode

Set `debug: true` in your module options. The middleware logs every step of the
extraction pipeline with the `[MultiTenant]` prefix. Look for:

```
[MultiTenant] [GET /api/users] Extracting tenant using 'header' strategy
[MultiTenant] [GET /api/users] No tenant ID found
```

This tells you the strategy is running but the extraction returned null. If you do not
see any `[MultiTenant]` logs at all, the middleware is not being applied (see Check 1).

## Header Extraction Issues

### Header stripped by proxy

Cloud load balancers (AWS ALB, CloudFront) and reverse proxies (nginx) may strip
non-standard headers. For AWS ALB, custom headers are forwarded by default. For nginx,
add:

```nginx
proxy_set_header x-tenant-id $http_x_tenant_id;
```

For CloudFront, add the header to the cache policy's allowed headers or use an
origin request policy that forwards it.

### Header value is an array

If the same header is sent multiple times, `req.headers` may contain an array of
strings. The middleware only accepts `typeof value === 'string'`, so array values
return null. Ensure your client sends the header exactly once.

### Fastify header normalization

Fastify lowercases all header names automatically, same as Express. The middleware
already lowercases the configured header name when reading. No special handling needed.

## Subdomain Extraction Issues

### localhost / single-part hostnames

The subdomain strategy requires at least three hostname parts
(`subdomain.domain.tld`). On `localhost` or `127.0.0.1`, there is only one part, so
extraction always returns null.

**Workaround for development:** Use `/etc/hosts` entries:

```
127.0.0.1  tenant1.app.local
127.0.0.1  tenant2.app.local
```

Or use the header strategy in development and subdomain in production:

```typescript
MultiTenantModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    extractionStrategy: config.get('NODE_ENV') === 'production' ? 'subdomain' : 'header',
  }),
  inject: [ConfigService],
});
```

### Proxy hostname override

Behind a reverse proxy, `req.hostname` may reflect the proxy's hostname rather than
the original. Ensure the proxy sets `X-Forwarded-Host` and your Express/Fastify app
trusts the proxy (`app.set('trust proxy', true)` for Express, or
`trustProxy: true` in Fastify options).

## JWT Extraction Issues

### Token decoded but claim not found

The JWT strategy reads a specific claim from the decoded payload using dot-notation
path traversal. If your claim is nested (e.g., `custom:tenantId` or
`https://example.com/tenant`), verify:

1. The `jwtTenantClaim` option matches the exact key path.
2. Dot-notation works for nested objects (`user.org.id`), but not for keys that
   contain literal dots. If your claim key contains dots, use the `custom` strategy
   with a `customExtractor` instead.

### Token is not a JWT

The `jwt` strategy expects a three-part base64url-encoded JWT. If the token is an
opaque string (API key, session token), use the `bearer` strategy with a
`bearerTokenResolver` instead.

### Token verification

The middleware does **not** verify JWT signatures. It decodes the payload segment
directly. Token verification must be handled by a separate auth guard
(`@nestjs/passport`, `@nestjs/jwt`, Cognito JWKS validation, etc.) that runs before
or alongside the tenant middleware.

## Cookie Extraction Issues

### Cookies not parsed

If `req.cookies` is undefined (no `cookie-parser` or `@fastify/cookie` middleware),
the middleware falls back to manually parsing the `Cookie` header. This should work
transparently, but if you see issues:

1. Check that the `Cookie` header is being forwarded by your proxy.
2. Check that the cookie name matches exactly (case-sensitive).
3. If using Fastify, install `@fastify/cookie` and register it before the NestJS app
   starts.

### SameSite / Secure flags

Cross-origin requests may not send cookies unless the cookie is set with
`SameSite=None; Secure`. This is a browser/HTTP concern outside the library's scope,
but it is a common cause of "tenant not resolving" in production with cookie strategy.

## GraphQL Tenant Context

### Tenant undefined in resolvers

The GraphQL decorators require the request object to be passed through the GraphQL
context. Verify your GraphQL module configuration includes:

```typescript
GraphQLModule.forRoot({
  context: ({ req }) => ({ req }),
  // ...
});
```

Without this, `GqlExecutionContext.create(ctx).getContext().req` will not have the
tenant attached.

### `@nestjs/graphql` not installed

The `@CurrentTenant()` decorator dynamically imports `@nestjs/graphql` with a
`try/catch`. If `@nestjs/graphql` is not installed, it falls back to the HTTP context
(`ctx.switchToHttp().getRequest()`). This means GraphQL resolvers will still work if
the request object is available via the HTTP context, but it is not guaranteed. Install
`@nestjs/graphql` if you use GraphQL.

## GraphQL Subscription (WebSocket) Tenant Context

GraphQL subscriptions use WebSocket connections, not HTTP requests. The middleware
only runs on HTTP requests, so subscriptions do not automatically get a tenant context.

**Solution:** Set the tenant during the WebSocket connection handshake. In your
subscription setup, extract the tenant from the connection params or headers:

```typescript
GraphQLModule.forRoot({
  subscriptions: {
    'graphql-ws': {
      onConnect: async (context) => {
        const tenantId = context.connectionParams?.tenantId as string;
        if (tenantId) {
          const tenant = await tenantService.findById(tenantId);
          return { req: { tenant } };
        }
      },
    },
  },
});
```

Then `@CurrentTenant()` will read from the subscription context's `req.tenant`.

## Testing With Mocked Tenants

### Using the testing utilities

Import from the `testing` subpath:

```typescript
import {
  createMockTenantContext,
  createMockRequest,
  createMockExecutionContext,
  createTestTenant,
} from '@lexmata/nestjs-multi-tenant/testing';
```

### Mocking TenantContextService in unit tests

Replace `TenantContextService` with `MockTenantContextService` in your test module:

```typescript
import { Test } from '@nestjs/testing';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { createMockTenantContext } from '@lexmata/nestjs-multi-tenant/testing';

const mockTenantContext = createMockTenantContext({ id: 'test-tenant' });

const module = await Test.createTestingModule({
  providers: [
    { provide: TenantContextService, useValue: mockTenantContext },
    MyService,
  ],
}).compile();
```

To change the tenant between tests:

```typescript
beforeEach(() => {
  mockTenantContext.setTenant({ id: 'tenant-abc', name: 'Test Corp' });
});

afterEach(() => {
  mockTenantContext.clear();
});
```

### Mocking tenant in E2E / integration tests

For supertest-based tests, send the tenant header with your requests:

```typescript
await request(app.getHttpServer())
  .get('/api/users')
  .set('x-tenant-id', 'test-tenant')
  .expect(200);
```

### AsyncLocalStorage in tests

If your tests call service methods directly (not through HTTP), the
`TenantContextService` (real, not mock) needs an active `run()` context:

```typescript
const tenantContext = module.get(TenantContextService);
const myService = module.get(MyService);

tenantContext.run({ id: 'test-tenant' }, () => {
  const result = myService.doSomething();
  expect(result).toBeDefined();
});
```

Without `run()`, `getTenant()` returns `undefined` because there is no active async
local storage context.

## Version Compatibility

### NestJS Versions

The library supports NestJS 10.x and 11.x via the peer dependency range
`^10.0.0 || ^11.0.0`. If you encounter type errors after upgrading NestJS, ensure
you are using the latest version of this library.

Breaking changes between NestJS 10 and 11 that could affect this library:

- `ExecutionContext.getType()` generic type parameter -- handled in the guard and
  decorators with `getType<'http' | 'graphql' | 'rpc' | 'ws'>()`.
- Middleware signature changes -- the `PlatformRequest` interface abstracts over
  Express/Fastify differences.

### Node.js Versions

The library requires Node.js >= 20.0.0 (for stable `AsyncLocalStorage`). CI tests
against Node.js 20 and 22.

### reflect-metadata Versions

Both `reflect-metadata` 0.1.x and 0.2.x are supported. NestJS 11 ships with 0.2.x
by default.

### TypeScript Versions

The library is compiled with TypeScript 5.x. If you see type errors with older
TypeScript versions, upgrade to 5.0+.

## Debugging Techniques

### 1. Enable debug mode

```typescript
MultiTenantModule.forRoot({
  debug: true,
  // ...
});
```

This logs every step of the extraction pipeline. Look for the `[MultiTenant]` prefix
in your application logs.

### 2. Use event hooks for diagnostics

```typescript
eventHooks: {
  onTenantMissing: (ctx) => {
    console.log('No tenant for:', ctx.path, ctx.strategy);
  },
  onTenantNotFound: (id, ctx) => {
    console.log('Tenant resolver returned null for:', id);
  },
},
```

### 3. Inspect the request object

In a controller or interceptor, inspect the raw request to see if the header/cookie/etc.
is actually present:

```typescript
@Get('debug')
debug(@Req() req: Request) {
  return {
    headers: req.headers,
    cookies: req.cookies,
    tenant: (req as any).tenant,
    hostname: req.hostname,
    path: req.path,
  };
}
```

### 4. Check middleware ordering

NestJS applies middleware in the order they are registered. If another middleware
modifies the request (e.g., strips headers, modifies the URL) before `TenantMiddleware`
runs, that could cause extraction failures. `TenantMiddleware` is applied via
`forRoutes('*')` in `MultiTenantModule.configure()`, which runs during module
initialization.

### 5. Verify AsyncLocalStorage propagation

If tenant context is lost in async operations, verify you are not breaking the async
context chain. Common causes:

- Using `setTimeout` or `setInterval` without passing the callback through the async
  context (Node.js >= 20 handles this correctly for most cases).
- Using third-party libraries that create new async contexts (rare but possible).
- Using `worker_threads` -- `AsyncLocalStorage` does not propagate across threads.
