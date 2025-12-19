import { describe, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { MiddlewareConsumer } from '@nestjs/common';
import { MultiTenantModule } from './multi-tenant.module';
import { TenantContextService } from './services';
import { TenantMiddleware } from './middleware';
import { TenantGuard } from './guards';
import { MULTI_TENANT_OPTIONS } from './constants';

describe('MultiTenantModule', () => {
  describe('forRoot', () => {
    it('should create module with default options', async () => {
      const module = await Test.createTestingModule({
        imports: [MultiTenantModule.forRoot()],
      }).compile();

      const tenantContext = module.get(TenantContextService);
      const tenantGuard = module.get(TenantGuard);
      const options = module.get(MULTI_TENANT_OPTIONS);

      expect(tenantContext).toBeDefined();
      expect(tenantGuard).toBeDefined();
      expect(options).toEqual({});
    }, 10_000);

    it('should create module with custom options', async () => {
      const customOptions = {
        extractionStrategy: 'header' as const,
        tenantHeader: 'x-custom-tenant',
        requireTenant: true,
      };

      const module = await Test.createTestingModule({
        imports: [MultiTenantModule.forRoot(customOptions)],
      }).compile();

      const options = module.get(MULTI_TENANT_OPTIONS);

      expect(options).toEqual(customOptions);
    }, 10_000);

    it('should be a global module', async () => {
      const dynamicModule = MultiTenantModule.forRoot();

      expect(dynamicModule.global).toBe(true);
    });

    it('should export TenantContextService', async () => {
      const dynamicModule = MultiTenantModule.forRoot();

      expect(dynamicModule.exports).toContain(TenantContextService);
    });

    it('should export TenantGuard', async () => {
      const dynamicModule = MultiTenantModule.forRoot();

      expect(dynamicModule.exports).toContain(TenantGuard);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async factory', async () => {
      const asyncOptions = {
        extractionStrategy: 'subdomain' as const,
        requireTenant: false,
      };

      const module = await Test.createTestingModule({
        imports: [
          MultiTenantModule.forRootAsync({
            useFactory: () => asyncOptions,
          }),
        ],
      }).compile();

      const options = module.get(MULTI_TENANT_OPTIONS);

      expect(options).toEqual(asyncOptions);
    }, 10_000);

    it('should support async factory function', async () => {
      const module = await Test.createTestingModule({
        imports: [
          MultiTenantModule.forRootAsync({
            useFactory: async () => {
              await new Promise((resolve) => setTimeout(resolve, 10));
              return {
                extractionStrategy: 'query' as const,
              };
            },
          }),
        ],
      }).compile();

      const options = module.get(MULTI_TENANT_OPTIONS);

      expect(options.extractionStrategy).toBe('query');
    }, 10_000);

    it('should inject dependencies into factory', async () => {
      const CONFIG_TOKEN = 'CONFIG';
      const mockConfig = { tenantHeader: 'x-org-id' };

      // Create a config module that provides the config
      const ConfigModule = {
        module: class ConfigModule {},
        providers: [{ provide: CONFIG_TOKEN, useValue: mockConfig }],
        exports: [CONFIG_TOKEN],
      };

      const module = await Test.createTestingModule({
        imports: [
          MultiTenantModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (config: typeof mockConfig) => ({
              tenantHeader: config.tenantHeader,
            }),
            inject: [CONFIG_TOKEN],
          }),
        ],
      }).compile();

      const options = module.get(MULTI_TENANT_OPTIONS);

      expect(options.tenantHeader).toBe('x-org-id');
    }, 10_000);

    it('should be a global module', async () => {
      const dynamicModule = MultiTenantModule.forRootAsync({
        useFactory: () => ({}),
      });

      expect(dynamicModule.global).toBe(true);
    });

    it('should handle empty imports array', async () => {
      const dynamicModule = MultiTenantModule.forRootAsync({
        imports: [],
        useFactory: () => ({ extractionStrategy: 'header' as const }),
      });

      expect(dynamicModule.imports).toEqual([]);
    });

    it('should handle empty inject array', async () => {
      const dynamicModule = MultiTenantModule.forRootAsync({
        useFactory: () => ({ extractionStrategy: 'header' as const }),
        inject: [],
      });

      expect(dynamicModule.providers).toBeDefined();
    });
  });

  describe('configure', () => {
    it('should apply TenantMiddleware to all routes', () => {
      const module = new MultiTenantModule();

      const mockForRoutes = vi.fn().mockReturnThis();
      const mockApply = vi.fn().mockReturnValue({ forRoutes: mockForRoutes });

      const mockConsumer: MiddlewareConsumer = {
        apply: mockApply,
        exclude: vi.fn().mockReturnThis(),
      } as unknown as MiddlewareConsumer;

      module.configure(mockConsumer);

      expect(mockApply).toHaveBeenCalledWith(TenantMiddleware);
      expect(mockForRoutes).toHaveBeenCalledWith('*');
    });
  });

  describe('module structure', () => {
    it('should export MULTI_TENANT_OPTIONS token', () => {
      const dynamicModule = MultiTenantModule.forRoot();

      expect(dynamicModule.exports).toContain(MULTI_TENANT_OPTIONS);
    });

    it('should provide TenantMiddleware', () => {
      const dynamicModule = MultiTenantModule.forRoot();
      const providers = dynamicModule.providers?.map((p: any) =>
        typeof p === 'function' ? p : p.provide,
      );

      expect(providers).toContain(TenantMiddleware);
    });

    it('should provide TenantContextService', () => {
      const dynamicModule = MultiTenantModule.forRoot();
      const providers = dynamicModule.providers?.map((p: any) =>
        typeof p === 'function' ? p : p.provide,
      );

      expect(providers).toContain(TenantContextService);
    });

    it('should provide TenantGuard', () => {
      const dynamicModule = MultiTenantModule.forRoot();
      const providers = dynamicModule.providers?.map((p: any) =>
        typeof p === 'function' ? p : p.provide,
      );

      expect(providers).toContain(TenantGuard);
    });

    it('should provide options with MULTI_TENANT_OPTIONS token', () => {
      const options = { extractionStrategy: 'header' as const };
      const dynamicModule = MultiTenantModule.forRoot(options);

      const optionsProvider = dynamicModule.providers?.find(
        (p: any) => p.provide === MULTI_TENANT_OPTIONS,
      ) as any;

      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useValue).toEqual(options);
    });
  });
});
