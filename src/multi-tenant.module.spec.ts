import { describe, it, expect, vi } from 'vitest';
import { MiddlewareConsumer } from '@nestjs/common';
import { MultiTenantModule } from './multi-tenant.module';
import { TenantContextService } from './services';
import { TenantMiddleware } from './middleware';
import { TenantGuard } from './guards';
import { MULTI_TENANT_OPTIONS } from './constants';

describe('MultiTenantModule', () => {
  describe('forRoot', () => {
    it('should create module with default options', () => {
      const dynamicModule = MultiTenantModule.forRoot();

      expect(dynamicModule.module).toBe(MultiTenantModule);
      expect(dynamicModule.global).toBe(true);

      // Check options provider
      const optionsProvider = dynamicModule.providers?.find(
        (p: any) => p.provide === MULTI_TENANT_OPTIONS,
      ) as any;
      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useValue).toEqual({});
    });

    it('should create module with custom options', () => {
      const customOptions = {
        extractionStrategy: 'header' as const,
        tenantHeader: 'x-custom-tenant',
        requireTenant: true,
      };

      const dynamicModule = MultiTenantModule.forRoot(customOptions);

      const optionsProvider = dynamicModule.providers?.find(
        (p: any) => p.provide === MULTI_TENANT_OPTIONS,
      ) as any;

      expect(optionsProvider.useValue).toEqual(customOptions);
    });

    it('should be a global module', () => {
      const dynamicModule = MultiTenantModule.forRoot();

      expect(dynamicModule.global).toBe(true);
    });

    it('should export TenantContextService', () => {
      const dynamicModule = MultiTenantModule.forRoot();

      expect(dynamicModule.exports).toContain(TenantContextService);
    });

    it('should export TenantGuard', () => {
      const dynamicModule = MultiTenantModule.forRoot();

      expect(dynamicModule.exports).toContain(TenantGuard);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async factory', () => {
      const asyncOptions = {
        extractionStrategy: 'subdomain' as const,
        requireTenant: false,
      };

      const dynamicModule = MultiTenantModule.forRootAsync({
        useFactory: () => asyncOptions,
      });

      expect(dynamicModule.module).toBe(MultiTenantModule);
      expect(dynamicModule.global).toBe(true);

      // Check that the factory provider is set up correctly
      const optionsProvider = dynamicModule.providers?.find(
        (p: any) => p.provide === MULTI_TENANT_OPTIONS,
      ) as any;
      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useFactory).toBeDefined();
    });

    it('should support async factory function', () => {
      const dynamicModule = MultiTenantModule.forRootAsync({
        useFactory: async () => ({
          extractionStrategy: 'query' as const,
        }),
      });

      const optionsProvider = dynamicModule.providers?.find(
        (p: any) => p.provide === MULTI_TENANT_OPTIONS,
      ) as any;

      expect(optionsProvider.useFactory).toBeDefined();
      expect(typeof optionsProvider.useFactory).toBe('function');
    });

    it('should inject dependencies into factory', () => {
      const CONFIG_TOKEN = 'CONFIG';

      const dynamicModule = MultiTenantModule.forRootAsync({
        imports: [],
        useFactory: (config: { tenantHeader: string }) => ({
          tenantHeader: config.tenantHeader,
        }),
        inject: [CONFIG_TOKEN],
      });

      const optionsProvider = dynamicModule.providers?.find(
        (p: any) => p.provide === MULTI_TENANT_OPTIONS,
      ) as any;

      expect(optionsProvider.useFactory).toBeDefined();
      expect(optionsProvider.inject).toContain(CONFIG_TOKEN);
    });

    it('should be a global module', () => {
      const dynamicModule = MultiTenantModule.forRootAsync({
        useFactory: () => ({}),
      });

      expect(dynamicModule.global).toBe(true);
    });

    it('should handle empty imports array', () => {
      const dynamicModule = MultiTenantModule.forRootAsync({
        imports: [],
        useFactory: () => ({ extractionStrategy: 'header' as const }),
      });

      expect(dynamicModule.imports).toEqual([]);
    });

    it('should handle empty inject array', () => {
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
