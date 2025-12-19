/**
 * E2E Integration Tests for Multi-Tenant Module
 *
 * Tests the full request lifecycle with a real NestJS application
 *
 * Note: Due to NestJS testing module's middleware DI limitations,
 * these tests manually apply the middleware using Express middleware.
 */
import 'reflect-metadata';

import { Controller, Get, INestApplication } from '@nestjs/common';
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
  });

  // Note: TenantGuard tests are covered in unit tests.
  // E2E testing of guards requires full NestJS module setup with proper DI,
  // which is complex in isolated test environments.

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
  });
});
