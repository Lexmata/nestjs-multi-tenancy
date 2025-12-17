import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentTenant, TenantId } from './tenant.decorator';

// Helper to get the factory function from a param decorator
function getParamDecoratorFactory(decorator: Function) {
  class TestController {
    test(@decorator() value: unknown) {
      return value;
    }
  }

  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test');
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

// Helper to create HTTP context mock
function createHttpContext(tenant?: { id: string; name?: string }) {
  return {
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({ tenant }),
    }),
  } as unknown as ExecutionContext;
}

// Helper to create GraphQL context mock
function createGraphQLContext(tenant?: { id: string; name?: string }) {
  return {
    getType: vi.fn().mockReturnValue('graphql'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({ tenant }),
    }),
  } as unknown as ExecutionContext;
}

// Helper to create WebSocket context mock
function createWsContext(client: {
  tenant?: { id: string; name?: string };
  handshake?: { tenant?: { id: string; name?: string } };
  data?: { tenant?: { id: string; name?: string } };
}) {
  return {
    getType: vi.fn().mockReturnValue('ws'),
    switchToWs: vi.fn().mockReturnValue({
      getClient: vi.fn().mockReturnValue(client),
      getData: vi.fn().mockReturnValue({}),
    }),
  } as unknown as ExecutionContext;
}

describe('CurrentTenant Decorator', () => {
  describe('HTTP context', () => {
    it('should extract tenant from request', () => {
      const tenant = { id: 'tenant-123', name: 'Test Tenant' };
      const mockExecutionContext = createHttpContext(tenant);

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      expect(result).toEqual(tenant);
    });

    it('should return undefined when tenant is not set', () => {
      const mockExecutionContext = createHttpContext();

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      expect(result).toBeUndefined();
    });

    it('should return tenant with additional properties', () => {
      const tenant = {
        id: 'tenant-456',
        name: 'Enterprise',
        plan: 'premium',
        settings: { maxUsers: 100 },
      };
      const mockRequest = { tenant };

      const mockExecutionContext = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      expect(result).toEqual(tenant);
      expect(result.plan).toBe('premium');
    });
  });

  describe('GraphQL context', () => {
    let mockGqlExecutionContext: {
      create: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      // Mock the @nestjs/graphql module
      mockGqlExecutionContext = {
        create: vi.fn(),
      };
      vi.doMock('@nestjs/graphql', () => ({
        GqlExecutionContext: mockGqlExecutionContext,
      }));
    });

    afterEach(() => {
      vi.doUnmock('@nestjs/graphql');
    });

    it('should fall back to HTTP when @nestjs/graphql is not installed', () => {
      const tenant = { id: 'tenant-gql', name: 'GraphQL Tenant' };
      const mockExecutionContext = createGraphQLContext(tenant);

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      // Falls back to HTTP extraction since @nestjs/graphql is not actually installed
      expect(result).toEqual(tenant);
    });
  });

  describe('WebSocket context', () => {
    it('should extract tenant from client.tenant', () => {
      const tenant = { id: 'tenant-ws', name: 'WebSocket Tenant' };
      const mockExecutionContext = createWsContext({ tenant });

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      expect(result).toEqual(tenant);
    });

    it('should extract tenant from client.handshake.tenant', () => {
      const tenant = { id: 'tenant-handshake', name: 'Handshake Tenant' };
      const mockExecutionContext = createWsContext({ handshake: { tenant } });

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      expect(result).toEqual(tenant);
    });

    it('should extract tenant from client.data.tenant', () => {
      const tenant = { id: 'tenant-data', name: 'Data Tenant' };
      const mockExecutionContext = createWsContext({ data: { tenant } });

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      expect(result).toEqual(tenant);
    });

    it('should prefer client.tenant over handshake.tenant', () => {
      const clientTenant = { id: 'client-tenant', name: 'Client' };
      const handshakeTenant = { id: 'handshake-tenant', name: 'Handshake' };
      const mockExecutionContext = createWsContext({
        tenant: clientTenant,
        handshake: { tenant: handshakeTenant },
      });

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      expect(result).toEqual(clientTenant);
    });

    it('should return undefined when no tenant in WebSocket client', () => {
      const mockExecutionContext = createWsContext({});

      const factory = getParamDecoratorFactory(CurrentTenant);
      const result = factory(null, mockExecutionContext);

      expect(result).toBeUndefined();
    });
  });
});

describe('TenantId Decorator', () => {
  describe('HTTP context', () => {
    it('should extract tenant ID from request', () => {
      const tenant = { id: 'tenant-789', name: 'Test' };
      const mockExecutionContext = createHttpContext(tenant);

      const factory = getParamDecoratorFactory(TenantId);
      const result = factory(null, mockExecutionContext);

      expect(result).toBe('tenant-789');
    });

    it('should return undefined when tenant is not set', () => {
      const mockExecutionContext = createHttpContext();

      const factory = getParamDecoratorFactory(TenantId);
      const result = factory(null, mockExecutionContext);

      expect(result).toBeUndefined();
    });

    it('should return undefined when tenant exists but has no id', () => {
      const mockRequest = { tenant: { name: 'No ID Tenant' } };

      const mockExecutionContext = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const factory = getParamDecoratorFactory(TenantId);
      const result = factory(null, mockExecutionContext);

      expect(result).toBeUndefined();
    });

    it('should handle null tenant gracefully', () => {
      const mockRequest = { tenant: null };

      const mockExecutionContext = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const factory = getParamDecoratorFactory(TenantId);
      const result = factory(null, mockExecutionContext);

      expect(result).toBeUndefined();
    });
  });

  describe('GraphQL context', () => {
    it('should fall back to HTTP when @nestjs/graphql is not installed', () => {
      const tenant = { id: 'tenant-gql-id', name: 'GraphQL Tenant' };
      const mockExecutionContext = createGraphQLContext(tenant);

      const factory = getParamDecoratorFactory(TenantId);
      const result = factory(null, mockExecutionContext);

      // Falls back to HTTP extraction
      expect(result).toBe('tenant-gql-id');
    });
  });

  describe('WebSocket context', () => {
    it('should extract tenant ID from WebSocket client', () => {
      const tenant = { id: 'tenant-ws-id', name: 'WebSocket Tenant' };
      const mockExecutionContext = createWsContext({ tenant });

      const factory = getParamDecoratorFactory(TenantId);
      const result = factory(null, mockExecutionContext);

      expect(result).toBe('tenant-ws-id');
    });

    it('should extract tenant ID from handshake', () => {
      const tenant = { id: 'tenant-handshake-id', name: 'Handshake Tenant' };
      const mockExecutionContext = createWsContext({ handshake: { tenant } });

      const factory = getParamDecoratorFactory(TenantId);
      const result = factory(null, mockExecutionContext);

      expect(result).toBe('tenant-handshake-id');
    });

    it('should return undefined when no tenant in WebSocket client', () => {
      const mockExecutionContext = createWsContext({});

      const factory = getParamDecoratorFactory(TenantId);
      const result = factory(null, mockExecutionContext);

      expect(result).toBeUndefined();
    });
  });
});
