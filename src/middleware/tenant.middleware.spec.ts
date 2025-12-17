import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { TenantContextService } from '../services';
import { MultiTenantModuleOptions } from '../interfaces';
import { Request, Response } from 'express';

// Helper to create a valid JWT token (unsigned, for testing)
const createTestJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'test-signature';
  return `${header}.${body}.${signature}`;
};

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let tenantContext: TenantContextService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  const createMiddleware = (options: MultiTenantModuleOptions = {}) => {
    tenantContext = new TenantContextService();
    middleware = new TenantMiddleware(tenantContext, options);
  };

  beforeEach(() => {
    mockRequest = {
      headers: {},
      hostname: 'example.com',
      path: '/api/users',
      query: {},
    };
    mockResponse = {};
    mockNext = vi.fn();
  });

  describe('header extraction strategy', () => {
    beforeEach(() => {
      createMiddleware({ extractionStrategy: 'header' });
    });

    it('should extract tenant ID from default header', async () => {
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from custom header', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantHeader: 'x-custom-tenant',
      });
      mockRequest.headers = { 'x-custom-tenant': 'tenant-456' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next without tenant when header is missing', async () => {
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('subdomain extraction strategy', () => {
    beforeEach(() => {
      createMiddleware({ extractionStrategy: 'subdomain' });
    });

    it('should extract tenant ID from subdomain', async () => {
      mockRequest.hostname = 'tenant1.example.com';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not extract tenant when no subdomain exists', async () => {
      mockRequest.hostname = 'example.com';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('path extraction strategy', () => {
    beforeEach(() => {
      createMiddleware({ extractionStrategy: 'path', tenantPathIndex: 0 });
    });

    it('should extract tenant ID from path', async () => {
      mockRequest.path = '/tenant-abc/api/users';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from custom path index', async () => {
      createMiddleware({ extractionStrategy: 'path', tenantPathIndex: 1 });
      mockRequest.path = '/api/tenant-xyz/users';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('query extraction strategy', () => {
    beforeEach(() => {
      createMiddleware({ extractionStrategy: 'query' });
    });

    it('should extract tenant ID from default query param', async () => {
      mockRequest.query = { tenantId: 'tenant-query' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from custom query param', async () => {
      createMiddleware({
        extractionStrategy: 'query',
        tenantQueryParam: 'org',
      });
      mockRequest.query = { org: 'org-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('cookie extraction strategy', () => {
    beforeEach(() => {
      createMiddleware({ extractionStrategy: 'cookie' });
    });

    it('should extract tenant ID from default cookie using cookie-parser', async () => {
      mockRequest.cookies = { tenant_id: 'cookie-tenant' };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('cookie-tenant');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from custom cookie name', async () => {
      createMiddleware({
        extractionStrategy: 'cookie',
        tenantCookie: 'org_id',
      });
      mockRequest.cookies = { org_id: 'custom-cookie-tenant' };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('custom-cookie-tenant');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from cookie header when cookie-parser is not used', async () => {
      mockRequest.cookies = undefined;
      mockRequest.headers = { cookie: 'tenant_id=header-parsed-tenant; other=value' };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('header-parsed-tenant');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle cookie with equals sign in value', async () => {
      mockRequest.cookies = undefined;
      mockRequest.headers = { cookie: 'tenant_id=tenant=with=equals' };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('tenant=with=equals');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when cookie is missing', async () => {
      mockRequest.cookies = {};

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when cookies object is undefined and no cookie header', async () => {
      mockRequest.cookies = undefined;
      mockRequest.headers = {};

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when cookie value is not a string', async () => {
      mockRequest.cookies = { tenant_id: { complex: 'object' } as any };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('jwt extraction strategy', () => {
    beforeEach(() => {
      createMiddleware({ extractionStrategy: 'jwt' });
    });

    it('should extract tenant ID from default JWT claim', async () => {
      const token = createTestJwt({ tenantId: 'jwt-tenant-123' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('jwt-tenant-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from custom JWT claim', async () => {
      createMiddleware({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'organizationId',
      });
      const token = createTestJwt({ organizationId: 'org-456' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('org-456');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from nested JWT claim using dot notation', async () => {
      createMiddleware({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'user.organization.id',
      });
      const token = createTestJwt({
        user: {
          organization: {
            id: 'nested-tenant',
            name: 'Acme Corp',
          },
        },
      });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('nested-tenant');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle lowercase bearer prefix', async () => {
      const token = createTestJwt({ tenantId: 'lowercase-bearer' });
      mockRequest.headers = { authorization: `bearer ${token}` };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('lowercase-bearer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when authorization header is missing', async () => {
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when authorization header has no Bearer prefix', async () => {
      const token = createTestJwt({ tenantId: 'no-bearer' });
      mockRequest.headers = { authorization: token }; // No Bearer prefix

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null for malformed JWT (not 3 parts)', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null for invalid base64 in JWT', async () => {
      mockRequest.headers = { authorization: 'Bearer header.!!!invalid-base64!!!.signature' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when JWT claim is not a string', async () => {
      const token = createTestJwt({ tenantId: 12_345 }); // Number, not string
      mockRequest.headers = { authorization: `Bearer ${token}` };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when nested claim path does not exist', async () => {
      createMiddleware({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'user.tenant.id',
      });
      const token = createTestJwt({ user: { name: 'John' } }); // No tenant.id
      mockRequest.headers = { authorization: `Bearer ${token}` };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when intermediate path is not an object', async () => {
      createMiddleware({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'user.tenant.id',
      });
      const token = createTestJwt({ user: 'not-an-object' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when authorization header is not a string', async () => {
      mockRequest.headers = { authorization: ['token1', 'token2'] as any };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('bearer extraction strategy', () => {
    it('should extract tenant ID using bearer token resolver', async () => {
      const bearerTokenResolver = vi.fn().mockReturnValue('bearer-tenant-123');
      createMiddleware({
        extractionStrategy: 'bearer',
        bearerTokenResolver,
      });
      mockRequest.headers = { authorization: 'Bearer my-api-key-abc123' };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bearerTokenResolver).toHaveBeenCalledWith('my-api-key-abc123');
      expect(capturedTenantId).toBe('bearer-tenant-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should support async bearer token resolver', async () => {
      const bearerTokenResolver = vi.fn().mockResolvedValue('async-bearer-tenant');
      createMiddleware({
        extractionStrategy: 'bearer',
        bearerTokenResolver,
      });
      mockRequest.headers = { authorization: 'Bearer async-api-key' };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bearerTokenResolver).toHaveBeenCalledWith('async-api-key');
      expect(capturedTenantId).toBe('async-bearer-tenant');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle lowercase bearer prefix', async () => {
      const bearerTokenResolver = vi.fn().mockReturnValue('lowercase-tenant');
      createMiddleware({
        extractionStrategy: 'bearer',
        bearerTokenResolver,
      });
      mockRequest.headers = { authorization: 'bearer lowercase-token' };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bearerTokenResolver).toHaveBeenCalledWith('lowercase-token');
      expect(capturedTenantId).toBe('lowercase-tenant');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when bearer resolver is not provided', async () => {
      createMiddleware({ extractionStrategy: 'bearer' });
      mockRequest.headers = { authorization: 'Bearer some-token' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when authorization header is missing', async () => {
      const bearerTokenResolver = vi.fn().mockReturnValue('tenant');
      createMiddleware({
        extractionStrategy: 'bearer',
        bearerTokenResolver,
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bearerTokenResolver).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when authorization header has no Bearer prefix', async () => {
      const bearerTokenResolver = vi.fn().mockReturnValue('tenant');
      createMiddleware({
        extractionStrategy: 'bearer',
        bearerTokenResolver,
      });
      mockRequest.headers = { authorization: 'Basic dXNlcjpwYXNz' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bearerTokenResolver).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when bearer resolver returns null', async () => {
      const bearerTokenResolver = vi.fn().mockReturnValue(null);
      createMiddleware({
        extractionStrategy: 'bearer',
        bearerTokenResolver,
      });
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bearerTokenResolver).toHaveBeenCalledWith('invalid-token');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when token is empty after Bearer prefix', async () => {
      const bearerTokenResolver = vi.fn().mockReturnValue('tenant');
      createMiddleware({
        extractionStrategy: 'bearer',
        bearerTokenResolver,
      });
      mockRequest.headers = { authorization: 'Bearer ' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bearerTokenResolver).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle authorization header that is not a string', async () => {
      const bearerTokenResolver = vi.fn().mockReturnValue('tenant');
      createMiddleware({
        extractionStrategy: 'bearer',
        bearerTokenResolver,
      });
      mockRequest.headers = { authorization: ['token1', 'token2'] as any };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bearerTokenResolver).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('custom extraction strategy', () => {
    it('should use custom extractor function', async () => {
      const customExtractor = vi.fn().mockReturnValue('custom-tenant');
      createMiddleware({
        extractionStrategy: 'custom',
        customExtractor,
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(customExtractor).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle async custom extractor', async () => {
      const customExtractor = vi.fn().mockResolvedValue('async-tenant');
      createMiddleware({
        extractionStrategy: 'custom',
        customExtractor,
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(customExtractor).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireTenant option', () => {
    it('should throw when tenant is required but not found', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        requireTenant: true,
      });

      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
      ).rejects.toThrow(HttpException);
    });

    it('should not throw when tenant is found', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        requireTenant: true,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('tenantResolver option', () => {
    it('should resolve full tenant data', async () => {
      const tenantResolver = vi.fn().mockResolvedValue({
        id: 'resolved-id',
        name: 'Resolved Tenant',
        plan: 'premium',
      });
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledWith('tenant-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw when resolver returns null and tenant is required', async () => {
      const tenantResolver = vi.fn().mockResolvedValue(null);
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        requireTenant: true,
      });
      mockRequest.headers = { 'x-tenant-id': 'unknown-tenant' };

      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('excludeRoutes option', () => {
    it('should skip extraction for excluded string routes', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        requireTenant: true,
        excludeRoutes: ['/health', '/api/public'],
      });
      mockRequest.path = '/health';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip extraction for excluded regex routes', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        requireTenant: true,
        excludeRoutes: [/^\/api\/v\d+\/public/],
      });
      mockRequest.path = '/api/v2/public/docs';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip extraction for prefix-matched routes', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        requireTenant: true,
        excludeRoutes: ['/api/public'],
      });
      mockRequest.path = '/api/public/some/nested/path';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should return null for unknown extraction strategy', async () => {
      createMiddleware({
        extractionStrategy: 'unknown' as any,
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when custom strategy has no extractor', async () => {
      createMiddleware({
        extractionStrategy: 'custom',
        // No customExtractor provided
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when path has insufficient segments', async () => {
      createMiddleware({
        extractionStrategy: 'path',
        tenantPathIndex: 5, // Path doesn't have 6 segments
      });
      mockRequest.path = '/api/users';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when header value is an array', async () => {
      createMiddleware({
        extractionStrategy: 'header',
      });
      mockRequest.headers = { 'x-tenant-id': ['tenant-1', 'tenant-2'] as any };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return null when query param is not a string', async () => {
      createMiddleware({
        extractionStrategy: 'query',
      });
      mockRequest.query = { tenantId: ['tenant-1', 'tenant-2'] };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use headers.host as fallback for subdomain extraction', async () => {
      createMiddleware({
        extractionStrategy: 'subdomain',
      });
      mockRequest.hostname = '';
      mockRequest.headers = { host: 'tenant1.example.com' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty hostname and host header for subdomain', async () => {
      createMiddleware({
        extractionStrategy: 'subdomain',
      });
      mockRequest.hostname = '';
      mockRequest.headers = {};

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next without tenant when resolver returns null and tenant not required', async () => {
      const tenantResolver = vi.fn().mockResolvedValue(null);
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        requireTenant: false,
      });
      mockRequest.headers = { 'x-tenant-id': 'unknown-tenant' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledWith('unknown-tenant');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default extraction strategy when none provided', async () => {
      createMiddleware({}); // No extraction strategy
      mockRequest.headers = { 'x-tenant-id': 'default-tenant' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle custom extractor returning null', async () => {
      const customExtractor = vi.fn().mockReturnValue(null);
      createMiddleware({
        extractionStrategy: 'custom',
        customExtractor,
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(customExtractor).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle path with empty segments', async () => {
      createMiddleware({
        extractionStrategy: 'path',
        tenantPathIndex: 0,
      });
      mockRequest.path = '///tenant-123///api';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle root path for path extraction', async () => {
      createMiddleware({
        extractionStrategy: 'path',
        tenantPathIndex: 0,
      });
      mockRequest.path = '/';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default path index when tenantPathIndex is undefined', async () => {
      createMiddleware({
        extractionStrategy: 'path',
        // tenantPathIndex not set - should default to 0
      });
      mockRequest.path = '/tenant-from-default/api/users';

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('tenant-from-default');
    });

    it('should use tenantPathIndex of 0 when explicitly set to 0', async () => {
      createMiddleware({
        extractionStrategy: 'path',
        tenantPathIndex: 0,
      });
      mockRequest.path = '/explicit-zero-tenant/api/users';

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('explicit-zero-tenant');
    });
  });

  describe('tenant context integration', () => {
    it('should set tenant in context when extracted', async () => {
      createMiddleware({
        extractionStrategy: 'header',
      });
      mockRequest.headers = { 'x-tenant-id': 'context-tenant' };

      let capturedTenantId: string | undefined;
      mockNext.mockImplementation(() => {
        capturedTenantId = tenantContext.getTenantId();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenantId).toBe('context-tenant');
    });

    it('should set resolved tenant data in context', async () => {
      const resolvedTenant = {
        id: 'resolved-tenant',
        name: 'Resolved Name',
        plan: 'enterprise',
      };
      const tenantResolver = vi.fn().mockResolvedValue(resolvedTenant);
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      let capturedTenant: any;
      mockNext.mockImplementation(() => {
        capturedTenant = tenantContext.getTenant();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(capturedTenant).toEqual(resolvedTenant);
    });

    it('should not have tenant context when tenant is not found', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        requireTenant: false,
      });
      // No tenant header

      let hasTenant: boolean = true;
      mockNext.mockImplementation(() => {
        hasTenant = tenantContext.hasTenant();
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(hasTenant).toBe(false);
    });
  });

  describe('tenant resolver caching', () => {
    it('should cache resolved tenant when caching is enabled', async () => {
      const tenantResolver = vi.fn().mockResolvedValue({ id: 'tenant-123', name: 'Cached Tenant' });
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true },
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      // First request - should call resolver
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(1);
    });

    it('should not cache when caching is disabled', async () => {
      const tenantResolver = vi.fn().mockResolvedValue({ id: 'tenant-123', name: 'Tenant' });
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: false },
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledTimes(2);
    });

    it('should not cache when no cache options provided', async () => {
      const tenantResolver = vi.fn().mockResolvedValue({ id: 'tenant-123', name: 'Tenant' });
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledTimes(2);
    });

    it('should expire cached entries after TTL', async () => {
      vi.useFakeTimers();
      const tenantResolver = vi.fn().mockResolvedValue({ id: 'tenant-123', name: 'Tenant' });
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true, ttl: 1000 },
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      // First request
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(1);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      // Second request - should call resolver again
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should not expire cached entries before TTL', async () => {
      vi.useFakeTimers();
      const tenantResolver = vi.fn().mockResolvedValue({ id: 'tenant-123', name: 'Tenant' });
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true, ttl: 5000 },
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(1);

      // Advance time but stay within TTL
      vi.advanceTimersByTime(4999);

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should enforce max cache size', async () => {
      const tenantResolver = vi
        .fn()
        .mockImplementation((id: string) => Promise.resolve({ id, name: `Tenant ${id}` }));
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true, max: 2 },
      });

      // Add 3 tenants to cache (max is 2)
      mockRequest.headers = { 'x-tenant-id': 'tenant-1' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      mockRequest.headers = { 'x-tenant-id': 'tenant-2' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      mockRequest.headers = { 'x-tenant-id': 'tenant-3' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledTimes(3);

      // tenant-1 should be evicted, tenant-2 and tenant-3 should be cached
      mockRequest.headers = { 'x-tenant-id': 'tenant-1' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(4); // Called again

      mockRequest.headers = { 'x-tenant-id': 'tenant-3' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(4); // Still cached
    });

    it('should not cache null resolver results', async () => {
      const tenantResolver = vi.fn().mockResolvedValue(null);
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true },
      });
      mockRequest.headers = { 'x-tenant-id': 'unknown-tenant' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics via getCacheStats', async () => {
      const tenantResolver = vi.fn().mockResolvedValue({ id: 'tenant-123', name: 'Tenant' });
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true, ttl: 10_000, max: 500 },
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      const initialStats = middleware.getCacheStats();
      expect(initialStats.enabled).toBe(true);
      expect(initialStats.ttl).toBe(10_000);
      expect(initialStats.max).toBe(500);
      expect(initialStats.size).toBe(0);

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      const afterStats = middleware.getCacheStats();
      expect(afterStats.size).toBe(1);
    });

    it('should clear cache via clearCache', async () => {
      const tenantResolver = vi.fn().mockResolvedValue({ id: 'tenant-123', name: 'Tenant' });
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true },
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(middleware.getCacheStats().size).toBe(1);

      middleware.clearCache();
      expect(middleware.getCacheStats().size).toBe(0);

      // Should call resolver again
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(2);
    });

    it('should invalidate specific tenant via invalidateTenant', async () => {
      const tenantResolver = vi
        .fn()
        .mockImplementation((id: string) => Promise.resolve({ id, name: `Tenant ${id}` }));
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true },
      });

      mockRequest.headers = { 'x-tenant-id': 'tenant-1' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      mockRequest.headers = { 'x-tenant-id': 'tenant-2' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledTimes(2);
      expect(middleware.getCacheStats().size).toBe(2);

      // Invalidate tenant-1
      const result = middleware.invalidateTenant('tenant-1');
      expect(result).toBe(true);
      expect(middleware.getCacheStats().size).toBe(1);

      // tenant-1 should call resolver, tenant-2 should use cache
      mockRequest.headers = { 'x-tenant-id': 'tenant-1' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(3);

      mockRequest.headers = { 'x-tenant-id': 'tenant-2' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      expect(tenantResolver).toHaveBeenCalledTimes(3);
    });

    it('should return false when invalidating non-existent tenant', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver: vi.fn(),
        tenantResolverCache: { enabled: true },
      });

      const result = middleware.invalidateTenant('non-existent');
      expect(result).toBe(false);
    });

    it('should use default cache values when not specified', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver: vi.fn(),
        tenantResolverCache: { enabled: true },
      });

      const stats = middleware.getCacheStats();
      expect(stats.ttl).toBe(300_000); // 5 minutes default
      expect(stats.max).toBe(1000); // default max
    });

    it('should cache different tenants separately', async () => {
      const tenantResolver = vi
        .fn()
        .mockImplementation((id: string) => Promise.resolve({ id, name: `Tenant ${id}` }));
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver,
        tenantResolverCache: { enabled: true },
      });

      mockRequest.headers = { 'x-tenant-id': 'tenant-1' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      mockRequest.headers = { 'x-tenant-id': 'tenant-2' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledTimes(2);

      // Both should be cached now
      mockRequest.headers = { 'x-tenant-id': 'tenant-1' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      mockRequest.headers = { 'x-tenant-id': 'tenant-2' };
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tenantResolver).toHaveBeenCalledTimes(2);
    });
  });

  describe('event hooks', () => {
    describe('onTenantIdExtracted', () => {
      it('should call onTenantIdExtracted when tenant ID is extracted', async () => {
        const onTenantIdExtracted = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantIdExtracted },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantIdExtracted).toHaveBeenCalledTimes(1);
        expect(onTenantIdExtracted).toHaveBeenCalledWith(
          'tenant-123',
          expect.objectContaining({
            strategy: 'header',
            path: '/api/users',
          }),
        );
      });

      it('should support async onTenantIdExtracted hook', async () => {
        const onTenantIdExtracted = vi.fn().mockResolvedValue(undefined);
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantIdExtracted },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantIdExtracted).toHaveBeenCalledTimes(1);
      });

      it('should not call onTenantIdExtracted when no tenant ID', async () => {
        const onTenantIdExtracted = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantIdExtracted },
        });

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantIdExtracted).not.toHaveBeenCalled();
      });
    });

    describe('onTenantResolved', () => {
      it('should call onTenantResolved when tenant is resolved with resolver', async () => {
        const onTenantResolved = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          tenantResolver: () => ({ id: 'tenant-123', name: 'Test Tenant' }),
          eventHooks: { onTenantResolved },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantResolved).toHaveBeenCalledTimes(1);
        expect(onTenantResolved).toHaveBeenCalledWith(
          { id: 'tenant-123', name: 'Test Tenant' },
          expect.objectContaining({ strategy: 'header' }),
        );
      });

      it('should call onTenantResolved when no resolver (ID-only tenant)', async () => {
        const onTenantResolved = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantResolved },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantResolved).toHaveBeenCalledTimes(1);
        expect(onTenantResolved).toHaveBeenCalledWith(
          { id: 'tenant-123' },
          expect.objectContaining({ strategy: 'header' }),
        );
      });

      it('should support async onTenantResolved hook', async () => {
        const onTenantResolved = vi.fn().mockResolvedValue(undefined);
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantResolved },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantResolved).toHaveBeenCalledTimes(1);
      });
    });

    describe('onTenantNotFound', () => {
      it('should call onTenantNotFound when resolver returns null', async () => {
        const onTenantNotFound = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          tenantResolver: () => null,
          eventHooks: { onTenantNotFound },
        });
        mockRequest.headers = { 'x-tenant-id': 'unknown-tenant' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantNotFound).toHaveBeenCalledTimes(1);
        expect(onTenantNotFound).toHaveBeenCalledWith(
          'unknown-tenant',
          expect.objectContaining({
            strategy: 'header',
            path: '/api/users',
          }),
        );
      });

      it('should support async onTenantNotFound hook', async () => {
        const onTenantNotFound = vi.fn().mockResolvedValue(undefined);
        createMiddleware({
          extractionStrategy: 'header',
          tenantResolver: () => null,
          eventHooks: { onTenantNotFound },
        });
        mockRequest.headers = { 'x-tenant-id': 'unknown-tenant' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantNotFound).toHaveBeenCalledTimes(1);
      });

      it('should not call onTenantNotFound when tenant is found', async () => {
        const onTenantNotFound = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          tenantResolver: (id) => ({ id }),
          eventHooks: { onTenantNotFound },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantNotFound).not.toHaveBeenCalled();
      });
    });

    describe('onTenantMissing', () => {
      it('should call onTenantMissing when no tenant ID could be extracted', async () => {
        const onTenantMissing = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantMissing },
        });
        // No tenant header

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantMissing).toHaveBeenCalledTimes(1);
        expect(onTenantMissing).toHaveBeenCalledWith(
          expect.objectContaining({
            strategy: 'header',
            path: '/api/users',
          }),
        );
      });

      it('should support async onTenantMissing hook', async () => {
        const onTenantMissing = vi.fn().mockResolvedValue(undefined);
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantMissing },
        });

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantMissing).toHaveBeenCalledTimes(1);
      });

      it('should not call onTenantMissing when tenant ID is extracted', async () => {
        const onTenantMissing = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantMissing },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantMissing).not.toHaveBeenCalled();
      });
    });

    describe('multiple hooks', () => {
      it('should call multiple hooks in correct order for successful resolution', async () => {
        const callOrder: string[] = [];
        const onTenantIdExtracted = vi.fn().mockImplementation(() => callOrder.push('extracted'));
        const onTenantResolved = vi.fn().mockImplementation(() => callOrder.push('resolved'));

        createMiddleware({
          extractionStrategy: 'header',
          tenantResolver: (id) => ({ id, name: 'Test' }),
          eventHooks: { onTenantIdExtracted, onTenantResolved },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(callOrder).toEqual(['extracted', 'resolved']);
      });

      it('should call hooks with correct context for different strategies', async () => {
        const onTenantIdExtracted = vi.fn();
        createMiddleware({
          extractionStrategy: 'subdomain',
          eventHooks: { onTenantIdExtracted },
        });
        mockRequest.hostname = 'tenant-abc.example.com';

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantIdExtracted).toHaveBeenCalledWith(
          'tenant-abc',
          expect.objectContaining({
            strategy: 'subdomain',
          }),
        );
      });

      it('should include request in context', async () => {
        const onTenantIdExtracted = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: { onTenantIdExtracted },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantIdExtracted).toHaveBeenCalledWith(
          'tenant-123',
          expect.objectContaining({
            request: expect.any(Object),
          }),
        );
      });
    });

    describe('hooks without event handlers', () => {
      it('should work without any event hooks configured', async () => {
        createMiddleware({ extractionStrategy: 'header' });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await expect(
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
        ).resolves.not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should work with empty eventHooks object', async () => {
        createMiddleware({
          extractionStrategy: 'header',
          eventHooks: {},
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await expect(
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
        ).resolves.not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('tenant validation', () => {
    describe('basic validation', () => {
      it('should allow request when validator returns true', async () => {
        const tenantValidator = vi.fn().mockReturnValue(true);
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(tenantValidator).toHaveBeenCalledTimes(1);
        expect(tenantValidator).toHaveBeenCalledWith(
          { id: 'tenant-123' },
          expect.objectContaining({ strategy: 'header' }),
        );
        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow request when validator returns { valid: true }', async () => {
        const tenantValidator = vi.fn().mockReturnValue({ valid: true });
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject request when validator returns false and requireTenant is true', async () => {
        const tenantValidator = vi.fn().mockReturnValue(false);
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
          requireTenant: true,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await expect(
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
        ).rejects.toThrow(HttpException);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should continue without tenant when validator returns false and requireTenant is false', async () => {
        const tenantValidator = vi.fn().mockReturnValue(false);
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
          requireTenant: false,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('validation result with reason', () => {
      it('should use reason in error message when provided', async () => {
        const tenantValidator = vi.fn().mockReturnValue({
          valid: false,
          reason: 'Tenant subscription expired',
        });
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
          requireTenant: true,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        try {
          await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).message).toBe('Tenant subscription expired');
          expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
        }
      });

      it('should use default message when reason is not provided', async () => {
        const tenantValidator = vi.fn().mockReturnValue({ valid: false });
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
          requireTenant: true,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        try {
          await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).message).toBe('Tenant validation failed');
        }
      });
    });

    describe('async validation', () => {
      it('should support async validator returning true', async () => {
        const tenantValidator = vi.fn().mockResolvedValue(true);
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should support async validator returning false', async () => {
        const tenantValidator = vi.fn().mockResolvedValue(false);
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
          requireTenant: true,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await expect(
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
        ).rejects.toThrow(HttpException);
      });

      it('should support async validator returning validation result', async () => {
        const tenantValidator = vi.fn().mockResolvedValue({
          valid: false,
          reason: 'Tenant is suspended',
        });
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator,
          requireTenant: true,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        try {
          await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
          expect.fail('Should have thrown');
        } catch (error) {
          expect((error as HttpException).message).toBe('Tenant is suspended');
        }
      });
    });

    describe('validation with resolver', () => {
      it('should pass resolved tenant to validator', async () => {
        const tenantValidator = vi.fn().mockReturnValue(true);
        createMiddleware({
          extractionStrategy: 'header',
          tenantResolver: (id) => ({ id, name: 'Acme Corp', isActive: true }),
          tenantValidator,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(tenantValidator).toHaveBeenCalledWith(
          { id: 'tenant-123', name: 'Acme Corp', isActive: true },
          expect.any(Object),
        );
      });

      it('should not call validator if resolver returns null', async () => {
        const tenantValidator = vi.fn().mockReturnValue(true);
        createMiddleware({
          extractionStrategy: 'header',
          tenantResolver: () => null,
          tenantValidator,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(tenantValidator).not.toHaveBeenCalled();
      });
    });

    describe('onTenantValidationFailed hook', () => {
      it('should call onTenantValidationFailed when validation fails', async () => {
        const onTenantValidationFailed = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator: () => ({ valid: false, reason: 'Inactive tenant' }),
          eventHooks: { onTenantValidationFailed },
          requireTenant: true,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await expect(
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
        ).rejects.toThrow();

        expect(onTenantValidationFailed).toHaveBeenCalledTimes(1);
        expect(onTenantValidationFailed).toHaveBeenCalledWith(
          { id: 'tenant-123' },
          'Inactive tenant',
          expect.objectContaining({ strategy: 'header' }),
        );
      });

      it('should call onTenantValidationFailed with undefined reason when not provided', async () => {
        const onTenantValidationFailed = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator: () => false,
          eventHooks: { onTenantValidationFailed },
          requireTenant: true,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await expect(
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
        ).rejects.toThrow();

        expect(onTenantValidationFailed).toHaveBeenCalledWith(
          { id: 'tenant-123' },
          undefined,
          expect.any(Object),
        );
      });

      it('should not call onTenantValidationFailed when validation passes', async () => {
        const onTenantValidationFailed = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator: () => true,
          eventHooks: { onTenantValidationFailed },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(onTenantValidationFailed).not.toHaveBeenCalled();
      });
    });

    describe('validation order', () => {
      it('should validate after resolution and before onTenantResolved', async () => {
        const callOrder: string[] = [];
        const tenantResolver = vi.fn().mockImplementation((id) => {
          callOrder.push('resolved');
          return { id, name: 'Test' };
        });
        const tenantValidator = vi.fn().mockImplementation(() => {
          callOrder.push('validated');
          return true;
        });
        const onTenantResolved = vi.fn().mockImplementation(() => {
          callOrder.push('onResolved');
        });

        createMiddleware({
          extractionStrategy: 'header',
          tenantResolver,
          tenantValidator,
          eventHooks: { onTenantResolved },
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(callOrder).toEqual(['resolved', 'validated', 'onResolved']);
      });

      it('should not call onTenantResolved if validation fails', async () => {
        const onTenantResolved = vi.fn();
        createMiddleware({
          extractionStrategy: 'header',
          tenantValidator: () => false,
          eventHooks: { onTenantResolved },
          requireTenant: true,
        });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await expect(
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
        ).rejects.toThrow();

        expect(onTenantResolved).not.toHaveBeenCalled();
      });
    });

    describe('without validator', () => {
      it('should skip validation when no validator configured', async () => {
        createMiddleware({ extractionStrategy: 'header' });
        mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

        await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('debug mode', () => {
    let loggerDebugSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Spy on Logger.prototype.debug to capture log calls
      loggerDebugSpy = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
      loggerDebugSpy.mockRestore();
    });

    it('should log initialization when debug is true', () => {
      createMiddleware({
        extractionStrategy: 'header',
        debug: true,
      });

      expect(loggerDebugSpy).toHaveBeenCalledWith('MultiTenant middleware initialized');
      expect(loggerDebugSpy).toHaveBeenCalledWith('  Strategy: header');
    });

    it('should not log when debug is false', () => {
      createMiddleware({
        extractionStrategy: 'header',
        debug: false,
      });

      expect(loggerDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log when debug is not specified', () => {
      createMiddleware({ extractionStrategy: 'header' });

      expect(loggerDebugSpy).not.toHaveBeenCalled();
    });

    it('should log tenant extraction process', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        debug: true,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining("Extracting tenant using 'header' strategy"),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tenant ID extracted: tenant-123'),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Setting tenant context: tenant-123'),
      );
    });

    it('should log when no tenant ID found', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        debug: true,
      });
      // No tenant header

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerDebugSpy).toHaveBeenCalledWith(expect.stringContaining('No tenant ID found'));
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Continuing without tenant'),
      );
    });

    it('should log route exclusion', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        excludeRoutes: ['/health'],
        debug: true,
      });
      mockRequest.path = '/health';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Route excluded from tenant extraction'),
      );
    });

    it('should log tenant resolution', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver: (id) => ({ id, name: 'Acme Corp' }),
        debug: true,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Resolving tenant data for: tenant-123'),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tenant resolved: tenant-123 (Acme Corp)'),
      );
    });

    it('should log tenant not found', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver: () => null,
        debug: true,
      });
      mockRequest.headers = { 'x-tenant-id': 'unknown' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tenant not found: unknown'),
      );
    });

    it('should log validation process', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantValidator: () => true,
        debug: true,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validating tenant: tenant-123'),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Validation passed'));
    });

    it('should log validation failure', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantValidator: () => ({ valid: false, reason: 'Subscription expired' }),
        requireTenant: true,
        debug: true,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      await expect(
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext),
      ).rejects.toThrow();

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed: Subscription expired'),
      );
    });

    it('should log cache hit', async () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolver: (id) => ({ id, name: 'Acme' }),
        tenantResolverCache: { enabled: true },
        debug: true,
      });
      mockRequest.headers = { 'x-tenant-id': 'tenant-123' };

      // First call - cache miss
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      // Second call - cache hit
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(loggerDebugSpy).toHaveBeenCalledWith('Cache miss for tenant: tenant-123');
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cached tenant: tenant-123'),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith('Cache hit for tenant: tenant-123');
    });

    it('should log cache configuration on init', () => {
      createMiddleware({
        extractionStrategy: 'header',
        tenantResolverCache: { enabled: true, ttl: 60_000, max: 500 },
        debug: true,
      });

      expect(loggerDebugSpy).toHaveBeenCalledWith('  Cache enabled: true');
      expect(loggerDebugSpy).toHaveBeenCalledWith('  Cache TTL: 60000ms');
      expect(loggerDebugSpy).toHaveBeenCalledWith('  Cache max: 500');
    });
  });
});
