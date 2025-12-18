import { DynamicModule, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MULTI_TENANT_OPTIONS } from './constants';
import { TenantGuard } from './guards';
import type { MultiTenantModuleAsyncOptions, MultiTenantModuleOptions } from './interfaces';
import { TenantMiddleware } from './middleware';
import { TenantContextService } from './services';

/**
 * NestJS module for multi-tenant application support
 *
 * @example
 * ```typescript
 * // Synchronous configuration
 * @Module({
 *   imports: [
 *     MultiTenantModule.forRoot({
 *       extractionStrategy: 'header',
 *       tenantHeader: 'x-tenant-id',
 *       requireTenant: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // Asynchronous configuration
 * @Module({
 *   imports: [
 *     MultiTenantModule.forRootAsync({
 *       imports: [ConfigModule],
 *       useFactory: (config: ConfigService) => ({
 *         extractionStrategy: config.get('TENANT_STRATEGY'),
 *         tenantResolver: async (tenantId) => {
 *           // Fetch tenant from database
 *           return { id: tenantId, name: 'Tenant Name' };
 *         },
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class MultiTenantModule implements NestModule {
  /**
   * Configure the module with static options
   */
  static forRoot(options: MultiTenantModuleOptions = {}): DynamicModule {
    return {
      module: MultiTenantModule,
      global: true,
      providers: [
        {
          provide: MULTI_TENANT_OPTIONS,
          useValue: options,
        },
        TenantContextService,
        TenantMiddleware,
        TenantGuard,
      ],
      exports: [TenantContextService, TenantGuard, TenantMiddleware, MULTI_TENANT_OPTIONS],
    };
  }

  /**
   * Configure the module with async options (factory pattern)
   */
  static forRootAsync(options: MultiTenantModuleAsyncOptions): DynamicModule {
    return {
      module: MultiTenantModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MULTI_TENANT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        TenantContextService,
        TenantMiddleware,
        TenantGuard,
      ],
      exports: [TenantContextService, TenantGuard, TenantMiddleware, MULTI_TENANT_OPTIONS],
    };
  }

  /**
   * Apply tenant middleware to all routes
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
