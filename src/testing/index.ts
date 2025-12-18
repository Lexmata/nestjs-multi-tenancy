/**
 * Testing utilities for @lexmata/nestjs-multi-tenant
 *
 * These utilities help with mocking tenant context in unit tests.
 *
 * @example
 * ```typescript
 * import { createMockTenantContext, MockTenantContextService } from '@lexmata/nestjs-multi-tenant/testing';
 *
 * // Create a mock tenant context service
 * const mockService = createMockTenantContext({ id: 'test-tenant', name: 'Test' });
 *
 * // Use in your test module
 * const module = await Test.createTestingModule({
 *   providers: [
 *     { provide: TenantContextService, useValue: mockService },
 *     MyService,
 *   ],
 * }).compile();
 * ```
 */

import type { Tenant } from '../interfaces';

// Empty noop function used as a default for handlers
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (): void => {};

/**
 * Mock implementation of TenantContextService for testing
 */
export class MockTenantContextService {
  private tenant: Tenant | undefined;

  constructor(tenant?: Tenant) {
    this.tenant = tenant;
  }

  /**
   * Set the current tenant for tests
   */
  setTenant(tenant: Tenant | undefined): void {
    this.tenant = tenant;
  }

  /**
   * Get the current tenant
   */
  getTenant(): Tenant | undefined {
    return this.tenant;
  }

  /**
   * Get the current tenant ID
   */
  getTenantId(): string | undefined {
    return this.tenant?.id;
  }

  /**
   * Check if a tenant is set
   */
  hasTenant(): boolean {
    return this.tenant !== undefined;
  }

  /**
   * Run a function within a tenant context (no-op for mock, just calls fn)
   */
  run<T>(tenant: Tenant, fn: () => T): T {
    const previousTenant = this.tenant;
    this.tenant = tenant;
    try {
      return fn();
    } finally {
      this.tenant = previousTenant;
    }
  }

  /**
   * Clear the tenant (useful for test cleanup)
   */
  clear(): void {
    this.tenant = undefined;
  }
}

/**
 * Create a mock TenantContextService with an optional initial tenant
 *
 * @param tenant - Optional initial tenant to set
 * @returns MockTenantContextService instance
 *
 * @example
 * ```typescript
 * // Without initial tenant
 * const mockContext = createMockTenantContext();
 * expect(mockContext.hasTenant()).toBe(false);
 *
 * // With initial tenant
 * const mockContext = createMockTenantContext({ id: 'tenant-123', name: 'Acme Corp' });
 * expect(mockContext.getTenantId()).toBe('tenant-123');
 * ```
 */
export function createMockTenantContext(tenant?: Tenant): MockTenantContextService {
  return new MockTenantContextService(tenant);
}

/**
 * Create a mock request object with tenant attached
 *
 * @param tenant - The tenant to attach to the request
 * @param overrides - Additional request properties to set
 * @returns Mock request object
 *
 * @example
 * ```typescript
 * const req = createMockRequest({ id: 'tenant-123' }, {
 *   method: 'GET',
 *   path: '/api/users',
 * });
 * expect(req.tenant?.id).toBe('tenant-123');
 * ```
 */
export function createMockRequest(
  tenant?: Tenant,
  overrides: Partial<{
    method: string;
    path: string;
    url: string;
    hostname: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string>;
    cookies: Record<string, string>;
  }> = {},
): {
  tenant?: Tenant;
  method: string;
  path: string;
  url: string;
  hostname: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string>;
  cookies: Record<string, string>;
} {
  return {
    tenant,
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/',
    url: overrides.url ?? overrides.path ?? '/',
    hostname: overrides.hostname ?? 'localhost',
    headers: overrides.headers ?? {},
    query: overrides.query ?? {},
    cookies: overrides.cookies ?? {},
  };
}

/**
 * Create a mock execution context for testing guards and decorators
 *
 * @param tenant - The tenant to include in the request
 * @param options - Additional options for the context
 * @returns Mock ExecutionContext-like object
 *
 * @example
 * ```typescript
 * const ctx = createMockExecutionContext({ id: 'tenant-123' });
 * const guard = new TenantGuard(new Reflector(), mockTenantContext);
 * expect(guard.canActivate(ctx)).toBe(true);
 * ```
 */
export function createMockExecutionContext(
  tenant?: Tenant,
  options: {
    type?: 'http' | 'graphql' | 'rpc' | 'ws';
    handler?: () => unknown;
    class?: new () => unknown;
  } = {},
): {
  switchToHttp: () => {
    getRequest: () => { tenant?: Tenant };
    getResponse: () => Record<string, unknown>;
    getNext: () => () => void;
  };
  switchToRpc: () => {
    getData: () => { tenant?: Tenant };
    getContext: () => { tenant?: Tenant };
  };
  switchToWs: () => {
    getClient: () => { tenant?: Tenant };
    getData: () => { tenant?: Tenant };
  };
  getType: () => string;
  getHandler: () => () => unknown;
  getClass: () => new () => unknown;
  getArgs: () => unknown[];
  getArgByIndex: (index: number) => unknown;
} {
  const request = { tenant };

  const defaultHandler = options.handler ?? noop;
  const defaultClass = options.class ?? class DefaultClass {};
  const contextType = options.type ?? 'http';

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => noop,
    }),
    switchToRpc: () => ({
      getData: () => ({ tenant }),
      getContext: () => ({ tenant }),
    }),
    switchToWs: () => ({
      getClient: () => ({ tenant }),
      getData: () => ({ tenant }),
    }),
    getType: () => contextType,
    getHandler: () => defaultHandler,
    getClass: () => defaultClass,
    getArgs: () => [request],
    getArgByIndex: (index: number) => (index === 0 ? request : undefined),
  };
}

/**
 * Helper to create a tenant object for testing
 *
 * @param id - Tenant ID (required)
 * @param properties - Additional tenant properties
 * @returns Tenant object
 *
 * @example
 * ```typescript
 * const tenant = createTestTenant('tenant-123', { name: 'Acme Corp', plan: 'pro' });
 * ```
 */
export function createTestTenant(id: string, properties: Record<string, unknown> = {}): Tenant {
  return { id, ...properties };
}

/**
 * Type-safe helper for creating multiple test tenants
 *
 * @param tenants - Array of tenant definitions
 * @returns Array of Tenant objects
 *
 * @example
 * ```typescript
 * const tenants = createTestTenants([
 *   { id: 'tenant-1', name: 'Acme' },
 *   { id: 'tenant-2', name: 'Globex' },
 * ]);
 * ```
 */
export function createTestTenants(tenants: ({ id: string } & Record<string, unknown>)[]): Tenant[] {
  return tenants.map((t) => ({ ...t }));
}
