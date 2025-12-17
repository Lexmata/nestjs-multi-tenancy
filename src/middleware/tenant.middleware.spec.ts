import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { TenantContextService } from '../services';
import { MultiTenantModuleOptions } from '../interfaces';
import { Request, Response } from 'express';

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
});
