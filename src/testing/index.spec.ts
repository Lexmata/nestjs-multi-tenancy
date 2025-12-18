import { describe, expect, it } from 'vitest';

import {
  createMockExecutionContext,
  createMockRequest,
  createMockTenantContext,
  createTestTenant,
  createTestTenants,
  MockTenantContextService,
} from './index';

// Helper function for handler test
const testHandler = (): string => 'test';

describe('Testing Utilities', () => {
  describe('MockTenantContextService', () => {
    it('should create an instance without tenant', () => {
      const service = new MockTenantContextService();
      expect(service.hasTenant()).toBe(false);
      expect(service.getTenant()).toBeUndefined();
      expect(service.getTenantId()).toBeUndefined();
    });

    it('should create an instance with tenant', () => {
      const tenant = { id: 'tenant-123', name: 'Test Corp' };
      const service = new MockTenantContextService(tenant);
      expect(service.hasTenant()).toBe(true);
      expect(service.getTenant()).toEqual(tenant);
      expect(service.getTenantId()).toBe('tenant-123');
    });

    it('should allow setting tenant after creation', () => {
      const service = new MockTenantContextService();
      expect(service.hasTenant()).toBe(false);

      const tenant = { id: 'tenant-456' };
      service.setTenant(tenant);
      expect(service.hasTenant()).toBe(true);
      expect(service.getTenantId()).toBe('tenant-456');
    });

    it('should clear tenant', () => {
      const service = new MockTenantContextService({ id: 'tenant-789' });
      expect(service.hasTenant()).toBe(true);

      service.clear();
      expect(service.hasTenant()).toBe(false);
      expect(service.getTenant()).toBeUndefined();
    });

    it('should run function in tenant context', () => {
      const service = new MockTenantContextService();
      const tenant = { id: 'context-tenant' };

      const result = service.run(tenant, () => {
        expect(service.getTenantId()).toBe('context-tenant');
        return 'executed';
      });

      expect(result).toBe('executed');
      // Should restore previous state (undefined in this case)
      expect(service.hasTenant()).toBe(false);
    });

    it('should restore previous tenant after run', () => {
      const originalTenant = { id: 'original' };
      const service = new MockTenantContextService(originalTenant);

      const tempTenant = { id: 'temporary' };
      service.run(tempTenant, () => {
        expect(service.getTenantId()).toBe('temporary');
      });

      expect(service.getTenantId()).toBe('original');
    });

    it('should handle exceptions in run and still restore tenant', () => {
      const originalTenant = { id: 'original' };
      const service = new MockTenantContextService(originalTenant);

      expect(() => {
        service.run({ id: 'temp' }, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Should still restore original tenant
      expect(service.getTenantId()).toBe('original');
    });
  });

  describe('createMockTenantContext', () => {
    it('should create mock without tenant', () => {
      const mock = createMockTenantContext();
      expect(mock).toBeInstanceOf(MockTenantContextService);
      expect(mock.hasTenant()).toBe(false);
    });

    it('should create mock with tenant', () => {
      const tenant = { id: 'test-tenant', plan: 'pro' };
      const mock = createMockTenantContext(tenant);
      expect(mock.getTenant()).toEqual(tenant);
    });
  });

  describe('createMockRequest', () => {
    it('should create request with defaults', () => {
      const req = createMockRequest();
      expect(req.tenant).toBeUndefined();
      expect(req.method).toBe('GET');
      expect(req.path).toBe('/');
      expect(req.url).toBe('/');
      expect(req.hostname).toBe('localhost');
      expect(req.headers).toEqual({});
      expect(req.query).toEqual({});
      expect(req.cookies).toEqual({});
    });

    it('should create request with tenant', () => {
      const tenant = { id: 'req-tenant' };
      const req = createMockRequest(tenant);
      expect(req.tenant).toEqual(tenant);
    });

    it('should allow overriding properties', () => {
      const req = createMockRequest(
        { id: 'tenant' },
        {
          method: 'POST',
          path: '/api/users',
          hostname: 'test.example.com',
          headers: { 'x-tenant-id': 'header-tenant' },
          query: { filter: 'active' },
          cookies: { session: 'abc123' },
        },
      );

      expect(req.method).toBe('POST');
      expect(req.path).toBe('/api/users');
      expect(req.url).toBe('/api/users');
      expect(req.hostname).toBe('test.example.com');
      expect(req.headers).toEqual({ 'x-tenant-id': 'header-tenant' });
      expect(req.query).toEqual({ filter: 'active' });
      expect(req.cookies).toEqual({ session: 'abc123' });
    });

    it('should use path as url when url not provided', () => {
      const req = createMockRequest(undefined, { path: '/custom/path' });
      expect(req.url).toBe('/custom/path');
    });

    it('should allow explicit url override', () => {
      const req = createMockRequest(undefined, {
        path: '/path',
        url: '/full/url?query=1',
      });
      expect(req.url).toBe('/full/url?query=1');
    });
  });

  describe('createMockExecutionContext', () => {
    it('should create HTTP context with tenant', () => {
      const tenant = { id: 'ctx-tenant' };
      const ctx = createMockExecutionContext(tenant);

      const httpCtx = ctx.switchToHttp();
      expect(httpCtx.getRequest().tenant).toEqual(tenant);
      expect(httpCtx.getResponse()).toEqual({});
      expect(typeof httpCtx.getNext()).toBe('function');
    });

    it('should create RPC context with tenant', () => {
      const tenant = { id: 'rpc-tenant' };
      const ctx = createMockExecutionContext(tenant);

      const rpcCtx = ctx.switchToRpc();
      expect(rpcCtx.getData().tenant).toEqual(tenant);
      expect(rpcCtx.getContext().tenant).toEqual(tenant);
    });

    it('should create WS context with tenant', () => {
      const tenant = { id: 'ws-tenant' };
      const ctx = createMockExecutionContext(tenant);

      const wsCtx = ctx.switchToWs();
      expect(wsCtx.getClient().tenant).toEqual(tenant);
      expect(wsCtx.getData().tenant).toEqual(tenant);
    });

    it('should return default type as http', () => {
      const ctx = createMockExecutionContext();
      expect(ctx.getType()).toBe('http');
    });

    it('should allow custom type', () => {
      const ctx = createMockExecutionContext(undefined, { type: 'graphql' });
      expect(ctx.getType()).toBe('graphql');
    });

    it('should provide handler and class methods', () => {
      class TestClass {}
      const ctx = createMockExecutionContext(undefined, { handler: testHandler, class: TestClass });

      expect(ctx.getHandler()).toBe(testHandler);
      expect(ctx.getClass()).toBe(TestClass);
    });

    it('should provide getArgs and getArgByIndex', () => {
      const tenant = { id: 'args-tenant' };
      const ctx = createMockExecutionContext(tenant);

      const args = ctx.getArgs();
      expect(args).toHaveLength(1);
      expect(args[0]).toEqual({ tenant });

      expect(ctx.getArgByIndex(0)).toEqual({ tenant });
      expect(ctx.getArgByIndex(1)).toBeUndefined();
    });
  });

  describe('createTestTenant', () => {
    it('should create tenant with just id', () => {
      const tenant = createTestTenant('tenant-id');
      expect(tenant).toEqual({ id: 'tenant-id' });
    });

    it('should create tenant with additional properties', () => {
      const tenant = createTestTenant('tenant-id', {
        name: 'Acme Corp',
        plan: 'enterprise',
        features: ['a', 'b', 'c'],
      });
      expect(tenant).toEqual({
        id: 'tenant-id',
        name: 'Acme Corp',
        plan: 'enterprise',
        features: ['a', 'b', 'c'],
      });
    });
  });

  describe('createTestTenants', () => {
    it('should create multiple tenants', () => {
      const tenants = createTestTenants([
        { id: 'tenant-1', name: 'First' },
        { id: 'tenant-2', name: 'Second' },
        { id: 'tenant-3', name: 'Third', plan: 'pro' },
      ]);

      expect(tenants).toHaveLength(3);
      expect(tenants[0]).toEqual({ id: 'tenant-1', name: 'First' });
      expect(tenants[1]).toEqual({ id: 'tenant-2', name: 'Second' });
      expect(tenants[2]).toEqual({ id: 'tenant-3', name: 'Third', plan: 'pro' });
    });

    it('should create empty array when given empty input', () => {
      const tenants = createTestTenants([]);
      expect(tenants).toEqual([]);
    });
  });
});
