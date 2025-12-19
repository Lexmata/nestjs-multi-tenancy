/**
 * E2E Integration Tests for Multi-Tenant Module
 *
 * Tests the full request lifecycle with a real NestJS application
 *
 * Note: Due to NestJS testing module's middleware DI limitations,
 * these tests manually apply the middleware using Express middleware.
 */
import 'reflect-metadata';

import { Controller, Get, INestApplication, Post, Body, Param, Query } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CurrentTenant,
  MultiTenantModuleOptions,
  MULTI_TENANT_OPTIONS,
  Tenant,
  TenantContextService,
  TenantId,
  TenantMiddleware,
} from '../../src';

/**
 * Helper to create a test JWT token (unsigned, for testing only)
 */
function createTestJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'fake-signature'; // Not validated in extraction
  return `${header}.${body}.${signature}`;
}

// Test controller for e2e tests - simplified to only use decorators
@Controller('api')
class TestController {
  @Get('public')
  getPublic(@CurrentTenant() tenant: Tenant | undefined) {
    return { message: 'public endpoint', hasTenant: !!tenant };
  }

  @Get('tenant')
  getTenant(@CurrentTenant() tenant: Tenant | undefined) {
    return tenant ? { tenant } : {};
  }

  @Get('tenant-id')
  getTenantId(@TenantId() tenantId: string | undefined) {
    return tenantId ? { tenantId } : {};
  }

  @Get('context')
  getContext(
    @CurrentTenant() tenant: Tenant | undefined,
    @TenantId() tenantId: string | undefined,
  ) {
    return {
      tenant,
      tenantId,
      hasTenant: !!tenant,
    };
  }

  @Post('create')
  createResource(@CurrentTenant() tenant: Tenant | undefined, @Body() body: { name: string }) {
    return {
      tenant,
      created: body.name,
    };
  }

  @Get('resource/:id')
  getResource(@CurrentTenant() tenant: Tenant | undefined, @Param('id') id: string) {
    return {
      tenant,
      resourceId: id,
    };
  }

  @Get('search')
  searchResources(@CurrentTenant() tenant: Tenant | undefined, @Query('q') query: string) {
    return {
      tenant,
      query,
    };
  }
}

// Health controller for route exclusion tests
@Controller()
class HealthController {
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('api/public/info')
  getPublicInfo() {
    return { info: 'public' };
  }

  @Get('api/v1/docs')
  getDocs() {
    return { docs: 'available' };
  }
}

// Path-based controller
@Controller(':tenantId/api')
class PathTestController {
  @Get('data')
  getData(@CurrentTenant() tenant: Tenant | undefined) {
    return tenant ? { tenant } : {};
  }
}

/**
 * Helper to create a test application with given module options
 * Manually creates middleware to work around NestJS testing DI issues
 */
async function createTestApp(
  options: MultiTenantModuleOptions,
  controllers: unknown[] = [TestController],
): Promise<INestApplication> {
  // Create shared tenant context service
  const tenantContextService = new TenantContextService();

  // Create the middleware with manual dependency injection
  const middleware = new TenantMiddleware(tenantContextService, options);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    providers: [
      {
        provide: MULTI_TENANT_OPTIONS,
        useValue: options,
      },
      {
        provide: TenantContextService,
        useValue: tenantContextService,
      },
      {
        provide: TenantMiddleware,
        useValue: middleware,
      },
    ],
    controllers: controllers as [],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply middleware using Express middleware API with error handling
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await middleware.use(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  await app.init();
  return app;
}

describe('Multi-Tenant E2E Tests', () => {
  let app: INestApplication;

  afterEach(async () => {
    // app may not be initialized if test setup fails
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (app) {
      await app.close();
    }
  });

  describe('Header Extraction Strategy', () => {
    it('should extract tenant from header', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'tenant-123')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'tenant-123' } });
    });

    it('should extract tenant ID from header', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant-id')
        .set('x-tenant-id', 'tenant-456')
        .expect(200);

      expect(response.body).toEqual({ tenantId: 'tenant-456' });
    });

    it('should provide tenant context service', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/context')
        .set('x-tenant-id', 'tenant-789')
        .expect(200);

      expect(response.body).toEqual({
        tenant: { id: 'tenant-789' },
        tenantId: 'tenant-789',
        hasTenant: true,
      });
    });

    it('should return empty when no tenant header', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      const response = await request(app.getHttpServer()).get('/api/tenant').expect(200);

      expect(response.body).toEqual({});
    });

    it('should work with public endpoints', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      const response = await request(app.getHttpServer()).get('/api/public').expect(200);

      expect(response.body).toEqual({ message: 'public endpoint', hasTenant: false });
    });

    it('should use default header name when not specified', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        // tenantHeader defaults to 'x-tenant-id'
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'default-header-tenant')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'default-header-tenant' } });
    });

    it('should handle case-insensitive headers', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'X-Tenant-ID',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'case-insensitive-tenant')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'case-insensitive-tenant' } });
    });

    it('should work with POST requests', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      const response = await request(app.getHttpServer())
        .post('/api/create')
        .set('x-tenant-id', 'post-tenant')
        .send({ name: 'test-resource' })
        .expect(201);

      expect(response.body).toEqual({
        tenant: { id: 'post-tenant' },
        created: 'test-resource',
      });
    });

    it('should work with URL parameters', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/resource/res-123')
        .set('x-tenant-id', 'param-tenant')
        .expect(200);

      expect(response.body).toEqual({
        tenant: { id: 'param-tenant' },
        resourceId: 'res-123',
      });
    });

    it('should work with query parameters', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/search?q=test-query')
        .set('x-tenant-id', 'query-tenant')
        .expect(200);

      expect(response.body).toEqual({
        tenant: { id: 'query-tenant' },
        query: 'test-query',
      });
    });
  });

  describe('Query Parameter Extraction Strategy', () => {
    it('should extract tenant from query parameter', async () => {
      app = await createTestApp({
        extractionStrategy: 'query',
        tenantQueryParam: 'tenant',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant?tenant=query-tenant')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'query-tenant' } });
    });

    it('should extract tenant ID from query parameter', async () => {
      app = await createTestApp({
        extractionStrategy: 'query',
        tenantQueryParam: 'tenant',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant-id?tenant=query-456')
        .expect(200);

      expect(response.body).toEqual({ tenantId: 'query-456' });
    });

    it('should use default query param name', async () => {
      app = await createTestApp({
        extractionStrategy: 'query',
        // tenantQueryParam defaults to 'tenantId'
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant?tenantId=default-query-tenant')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'default-query-tenant' } });
    });

    it('should return empty when query param missing', async () => {
      app = await createTestApp({
        extractionStrategy: 'query',
        tenantQueryParam: 'tenant',
      });

      const response = await request(app.getHttpServer()).get('/api/tenant').expect(200);

      expect(response.body).toEqual({});
    });

    it('should handle query param with special characters', async () => {
      app = await createTestApp({
        extractionStrategy: 'query',
        tenantQueryParam: 'tenant',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant?tenant=tenant-with-special_chars.123')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'tenant-with-special_chars.123' } });
    });
  });

  describe('Path Extraction Strategy', () => {
    it('should extract tenant from URL path', async () => {
      app = await createTestApp(
        {
          extractionStrategy: 'path',
          tenantPathIndex: 0,
        },
        [PathTestController],
      );

      const response = await request(app.getHttpServer()).get('/path-tenant/api/data').expect(200);

      expect(response.body).toEqual({ tenant: { id: 'path-tenant' } });
    });

    it('should extract tenant from different path index', async () => {
      app = await createTestApp(
        {
          extractionStrategy: 'path',
          tenantPathIndex: 1,
        },
        [PathTestController],
      );

      await request(app.getHttpServer()).get('/api/tenant-at-index-1/data').expect(404);
      // 404 expected because the route doesn't match this pattern
    });

    it('should return empty when path segment missing', async () => {
      app = await createTestApp(
        {
          extractionStrategy: 'path',
          tenantPathIndex: 5, // Index beyond path segments
        },
        [PathTestController],
      );

      await request(app.getHttpServer()).get('/short/path').expect(404);
    });
  });

  describe('Cookie Extraction Strategy', () => {
    it('should extract tenant from cookie', async () => {
      app = await createTestApp({
        extractionStrategy: 'cookie',
        tenantCookie: 'tenant_id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Cookie', 'tenant_id=cookie-tenant')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'cookie-tenant' } });
    });

    it('should use default cookie name', async () => {
      app = await createTestApp({
        extractionStrategy: 'cookie',
        // tenantCookie defaults to 'tenant_id'
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Cookie', 'tenant_id=default-cookie-tenant')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'default-cookie-tenant' } });
    });

    it('should handle multiple cookies', async () => {
      app = await createTestApp({
        extractionStrategy: 'cookie',
        tenantCookie: 'tenant_id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Cookie', 'session=abc123; tenant_id=multi-cookie-tenant; other=value')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'multi-cookie-tenant' } });
    });

    it('should return empty when cookie missing', async () => {
      app = await createTestApp({
        extractionStrategy: 'cookie',
        tenantCookie: 'tenant_id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Cookie', 'other_cookie=value')
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should handle cookie with equals sign in value', async () => {
      app = await createTestApp({
        extractionStrategy: 'cookie',
        tenantCookie: 'tenant_id',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Cookie', 'tenant_id=tenant=with=equals')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'tenant=with=equals' } });
    });
  });

  describe('JWT Extraction Strategy', () => {
    it('should extract tenant from JWT tenantId claim', async () => {
      app = await createTestApp({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'tenantId',
      });

      const token = createTestJwt({ tenantId: 'jwt-tenant' });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'jwt-tenant' } });
    });

    it('should extract tenant from nested JWT claim', async () => {
      app = await createTestApp({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'user.organization.id',
      });

      const token = createTestJwt({
        user: {
          organization: {
            id: 'nested-tenant',
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'nested-tenant' } });
    });

    it('should return empty when JWT claim missing', async () => {
      app = await createTestApp({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'tenantId',
      });

      const token = createTestJwt({ userId: '123' }); // No tenantId claim

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should return empty when no Authorization header', async () => {
      app = await createTestApp({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'tenantId',
      });

      const response = await request(app.getHttpServer()).get('/api/tenant').expect(200);

      expect(response.body).toEqual({});
    });

    it('should return empty for invalid JWT format', async () => {
      app = await createTestApp({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'tenantId',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', 'Bearer invalid-jwt-format')
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should handle JWT with default tenantId claim', async () => {
      app = await createTestApp({
        extractionStrategy: 'jwt',
        // jwtTenantClaim defaults to 'tenantId'
      });

      const token = createTestJwt({ tenantId: 'default-claim-tenant' });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'default-claim-tenant' } });
    });

    it('should ignore non-Bearer authorization', async () => {
      app = await createTestApp({
        extractionStrategy: 'jwt',
        jwtTenantClaim: 'tenantId',
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe('Bearer Token Extraction Strategy', () => {
    it('should extract tenant using bearer token resolver', async () => {
      const mockResolver = vi.fn().mockResolvedValue('bearer-tenant');

      app = await createTestApp({
        extractionStrategy: 'bearer',
        bearerTokenResolver: mockResolver,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', 'Bearer api-key-12345')
        .expect(200);

      expect(mockResolver).toHaveBeenCalledWith('api-key-12345');
      expect(response.body).toEqual({ tenant: { id: 'bearer-tenant' } });
    });

    it('should return empty when resolver returns null', async () => {
      const mockResolver = vi.fn().mockResolvedValue(null);

      app = await createTestApp({
        extractionStrategy: 'bearer',
        bearerTokenResolver: mockResolver,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', 'Bearer invalid-api-key')
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should return empty when no Authorization header', async () => {
      const mockResolver = vi.fn().mockResolvedValue('some-tenant');

      app = await createTestApp({
        extractionStrategy: 'bearer',
        bearerTokenResolver: mockResolver,
      });

      const response = await request(app.getHttpServer()).get('/api/tenant').expect(200);

      expect(mockResolver).not.toHaveBeenCalled();
      expect(response.body).toEqual({});
    });

    it('should return empty when no bearer resolver configured', async () => {
      app = await createTestApp({
        extractionStrategy: 'bearer',
        // No bearerTokenResolver configured
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Authorization', 'Bearer some-token')
        .expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe('Custom Extraction Strategy', () => {
    it('should extract tenant using custom extractor', async () => {
      const customExtractor = vi.fn().mockReturnValue('custom-tenant');

      app = await createTestApp({
        extractionStrategy: 'custom',
        customExtractor,
      });

      const response = await request(app.getHttpServer()).get('/api/tenant').expect(200);

      expect(customExtractor).toHaveBeenCalled();
      expect(response.body).toEqual({ tenant: { id: 'custom-tenant' } });
    });

    it('should handle async custom extractor', async () => {
      const customExtractor = vi.fn().mockResolvedValue('async-custom-tenant');

      app = await createTestApp({
        extractionStrategy: 'custom',
        customExtractor,
      });

      const response = await request(app.getHttpServer()).get('/api/tenant').expect(200);

      expect(response.body).toEqual({ tenant: { id: 'async-custom-tenant' } });
    });

    it('should return empty when custom extractor returns null', async () => {
      const customExtractor = vi.fn().mockReturnValue(null);

      app = await createTestApp({
        extractionStrategy: 'custom',
        customExtractor,
      });

      const response = await request(app.getHttpServer()).get('/api/tenant').expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe('Tenant Resolver', () => {
    it('should resolve full tenant object', async () => {
      const mockResolver = vi
        .fn()
        .mockResolvedValue({ id: 'resolved-id', name: 'Resolved Tenant', plan: 'pro' });

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'tenant-to-resolve')
        .expect(200);

      expect(mockResolver).toHaveBeenCalledWith('tenant-to-resolve');
      expect(response.body).toEqual({
        tenant: { id: 'resolved-id', name: 'Resolved Tenant', plan: 'pro' },
      });
    });

    it('should handle resolver returning null', async () => {
      const mockResolver = vi.fn().mockResolvedValue(null);

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'unknown-tenant')
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should handle resolver with additional tenant properties', async () => {
      const mockResolver = vi.fn().mockResolvedValue({
        id: 'tenant-with-extras',
        name: 'Full Tenant',
        settings: { theme: 'dark' },
        metadata: { createdAt: '2024-01-01' },
      });

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'tenant-with-extras')
        .expect(200);

      expect(response.body.tenant).toHaveProperty('settings');
      expect(response.body.tenant).toHaveProperty('metadata');
    });
  });

  describe('Require Tenant Option', () => {
    it('should return 400 when tenant is required but missing', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        requireTenant: true,
      });

      const response = await request(app.getHttpServer()).get('/api/tenant').expect(400);

      expect(response.body.message).toBe('Tenant identification required');
    });

    it('should allow request when tenant is provided', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        requireTenant: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'required-tenant')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'required-tenant' } });
    });

    it('should return 404 when tenant required and resolver returns null', async () => {
      const mockResolver = vi.fn().mockResolvedValue(null);

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
        requireTenant: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'nonexistent-tenant')
        .expect(404);

      expect(response.body.message).toBe('Tenant not found');
    });
  });

  describe('Route Exclusions', () => {
    it('should exclude exact path match', async () => {
      app = await createTestApp(
        {
          extractionStrategy: 'header',
          tenantHeader: 'x-tenant-id',
          requireTenant: true,
          excludeRoutes: ['/health', /^\/api\/public/],
        },
        [TestController, HealthController],
      );

      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });

    it('should exclude regex path match', async () => {
      app = await createTestApp(
        {
          extractionStrategy: 'header',
          tenantHeader: 'x-tenant-id',
          requireTenant: true,
          excludeRoutes: ['/health', /^\/api\/public/],
        },
        [TestController, HealthController],
      );

      const response = await request(app.getHttpServer()).get('/api/public/info').expect(200);

      expect(response.body).toEqual({ info: 'public' });
    });

    it('should still require tenant for non-excluded routes', async () => {
      app = await createTestApp(
        {
          extractionStrategy: 'header',
          tenantHeader: 'x-tenant-id',
          requireTenant: true,
          excludeRoutes: ['/health', /^\/api\/public/],
        },
        [TestController, HealthController],
      );

      await request(app.getHttpServer()).get('/api/tenant').expect(400);
    });

    it('should handle prefix path exclusions', async () => {
      app = await createTestApp(
        {
          extractionStrategy: 'header',
          tenantHeader: 'x-tenant-id',
          requireTenant: true,
          excludeRoutes: ['/api/v1'],
        },
        [TestController, HealthController],
      );

      const response = await request(app.getHttpServer()).get('/api/v1/docs').expect(200);

      expect(response.body).toEqual({ docs: 'available' });
    });

    it('should handle multiple exclusion patterns', async () => {
      app = await createTestApp(
        {
          extractionStrategy: 'header',
          tenantHeader: 'x-tenant-id',
          requireTenant: true,
          excludeRoutes: ['/health', '/api/public', /^\/api\/v1/],
        },
        [TestController, HealthController],
      );

      // All excluded routes should work without tenant
      await request(app.getHttpServer()).get('/health').expect(200);
      await request(app.getHttpServer()).get('/api/public/info').expect(200);
      await request(app.getHttpServer()).get('/api/v1/docs').expect(200);

      // Non-excluded route should fail
      await request(app.getHttpServer()).get('/api/tenant').expect(400);
    });
  });

  describe('Tenant Validation', () => {
    it('should allow valid tenant', async () => {
      const mockValidator = vi.fn().mockReturnValue(true);

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: async (id) => ({ id, name: `Tenant ${id}` }),
        tenantValidator: mockValidator,
        requireTenant: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'valid-tenant')
        .expect(200);

      expect(mockValidator).toHaveBeenCalled();
      expect(response.body.tenant).toEqual({ id: 'valid-tenant', name: 'Tenant valid-tenant' });
    });

    it('should reject invalid tenant', async () => {
      const mockValidator = vi.fn().mockReturnValue({ valid: false, reason: 'Tenant suspended' });

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: async (id) => ({ id, name: `Tenant ${id}` }),
        tenantValidator: mockValidator,
        requireTenant: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'invalid-tenant')
        .expect(403);

      expect(response.body.message).toBe('Tenant suspended');
    });

    it('should handle async validator', async () => {
      const mockValidator = vi.fn().mockResolvedValue(true);

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: async (id) => ({ id, name: `Tenant ${id}` }),
        tenantValidator: mockValidator,
        requireTenant: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'async-valid-tenant')
        .expect(200);

      expect(response.body.tenant).toHaveProperty('id', 'async-valid-tenant');
    });

    it('should use default reason when validation returns false', async () => {
      const mockValidator = vi.fn().mockReturnValue(false);

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: async (id) => ({ id, name: `Tenant ${id}` }),
        tenantValidator: mockValidator,
        requireTenant: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'invalid-tenant')
        .expect(403);

      expect(response.body.message).toBe('Tenant validation failed');
    });
  });

  describe('Caching', () => {
    it('should cache resolved tenant', async () => {
      const mockResolver = vi
        .fn()
        .mockImplementation(async (id: string) => ({ id, name: `Tenant ${id}` }));

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
        tenantResolverCache: {
          enabled: true,
          ttl: 60_000,
          max: 100,
        },
      });

      // First request - should call resolver
      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'cached-tenant')
        .expect(200);

      expect(mockResolver).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'cached-tenant')
        .expect(200);

      expect(mockResolver).toHaveBeenCalledTimes(1); // Still 1, used cache
    });

    it('should resolve different tenants separately', async () => {
      const mockResolver = vi
        .fn()
        .mockImplementation(async (id: string) => ({ id, name: `Tenant ${id}` }));

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
        tenantResolverCache: {
          enabled: true,
          ttl: 60_000,
          max: 100,
        },
      });

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'tenant-a')
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'tenant-b')
        .expect(200);

      expect(mockResolver).toHaveBeenCalledTimes(2);
    });

    it('should not cache when caching is disabled', async () => {
      const mockResolver = vi
        .fn()
        .mockImplementation(async (id: string) => ({ id, name: `Tenant ${id}` }));

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
        tenantResolverCache: {
          enabled: false,
        },
      });

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'uncached-tenant')
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'uncached-tenant')
        .expect(200);

      expect(mockResolver).toHaveBeenCalledTimes(2); // Called twice, no caching
    });
  });

  describe('Event Hooks', () => {
    it('should call event hooks during request lifecycle', async () => {
      const onTenantIdExtracted = vi.fn();
      const onTenantResolved = vi.fn();

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: async (id) => ({ id, name: `Tenant ${id}` }),
        eventHooks: {
          onTenantIdExtracted,
          onTenantResolved,
        },
      });

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'hook-tenant')
        .expect(200);

      expect(onTenantIdExtracted).toHaveBeenCalledWith(
        'hook-tenant',
        expect.objectContaining({
          strategy: 'header',
          path: '/api/tenant',
        }),
      );

      expect(onTenantResolved).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'hook-tenant', name: 'Tenant hook-tenant' }),
        expect.objectContaining({
          strategy: 'header',
          path: '/api/tenant',
        }),
      );
    });

    it('should call onTenantNotFound when tenant not resolved', async () => {
      const onTenantNotFound = vi.fn();

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: async () => null,
        eventHooks: {
          onTenantNotFound,
        },
      });

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'missing-tenant')
        .expect(200);

      expect(onTenantNotFound).toHaveBeenCalledWith(
        'missing-tenant',
        expect.objectContaining({
          strategy: 'header',
        }),
      );
    });

    it('should call onTenantMissing when no tenant ID extracted', async () => {
      const onTenantMissing = vi.fn();

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        eventHooks: {
          onTenantMissing,
        },
      });

      await request(app.getHttpServer()).get('/api/tenant').expect(200);

      expect(onTenantMissing).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'header',
        }),
      );
    });

    it('should call onTenantValidationFailed when validation fails', async () => {
      const onTenantValidationFailed = vi.fn();

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: async (id) => ({ id, name: `Tenant ${id}` }),
        tenantValidator: () => ({ valid: false, reason: 'Test failure' }),
        requireTenant: true,
        eventHooks: {
          onTenantValidationFailed,
        },
      });

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'failing-tenant')
        .expect(403);

      expect(onTenantValidationFailed).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'failing-tenant' }),
        'Test failure',
        expect.objectContaining({
          strategy: 'header',
        }),
      );
    });
  });

  describe('Debug Mode', () => {
    it('should work with debug mode enabled', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        debug: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'debug-tenant')
        .expect(200);

      expect(response.body).toEqual({ tenant: { id: 'debug-tenant' } });
    });

    it('should work with debug mode and resolver', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: async (id) => ({ id, name: `Tenant ${id}` }),
        debug: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'debug-resolved-tenant')
        .expect(200);

      expect(response.body.tenant).toHaveProperty('name', 'Tenant debug-resolved-tenant');
    });

    it('should work with debug mode and caching', async () => {
      const mockResolver = vi.fn().mockResolvedValue({ id: 'cached', name: 'Cached Tenant' });

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
        tenantResolverCache: {
          enabled: true,
          ttl: 60_000,
          max: 100,
        },
        debug: true,
      });

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'debug-cached-tenant')
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'debug-cached-tenant')
        .expect(200);

      expect(mockResolver).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrent Requests', () => {
    it('should isolate tenant context between sequential requests', async () => {
      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
      });

      // Sequential requests to avoid connection issues
      const response1 = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'tenant-1')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'tenant-2')
        .expect(200);

      const response3 = await request(app.getHttpServer())
        .get('/api/tenant')
        .set('x-tenant-id', 'tenant-3')
        .expect(200);

      expect(response1.body).toEqual({ tenant: { id: 'tenant-1' } });
      expect(response2.body).toEqual({ tenant: { id: 'tenant-2' } });
      expect(response3.body).toEqual({ tenant: { id: 'tenant-3' } });
    });

    it('should isolate tenant context with resolver', async () => {
      const mockResolver = vi.fn().mockImplementation(async (id: string) => {
        return { id, name: `Tenant ${id}` };
      });

      app = await createTestApp({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        tenantResolver: mockResolver,
      });

      const response1 = await request(app.getHttpServer())
        .get('/api/context')
        .set('x-tenant-id', 'context-tenant-1')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/context')
        .set('x-tenant-id', 'context-tenant-2')
        .expect(200);

      expect(response1.body.tenantId).toBe('context-tenant-1');
      expect(response1.body.tenant.id).toBe('context-tenant-1');
      expect(response2.body.tenantId).toBe('context-tenant-2');
      expect(response2.body.tenant.id).toBe('context-tenant-2');
    });
  });
});
