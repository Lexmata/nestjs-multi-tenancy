import type { Abstract, DynamicModule, Type } from '@nestjs/common';
import type { InjectionToken, OptionalFactoryDependency } from '@nestjs/common/interfaces';

/**
 * Represents a tenant in a multi-tenant application
 */
export interface Tenant {
  /**
   * Unique identifier for the tenant
   */
  id: string;

  /**
   * Optional tenant name
   */
  name?: string;

  /**
   * Additional tenant metadata
   */
  [key: string]: unknown;
}

/**
 * Strategy for extracting tenant identifier from requests
 */
export type TenantExtractionStrategy =
  | 'cookie'
  | 'custom'
  | 'header'
  | 'jwt'
  | 'path'
  | 'query'
  | 'subdomain';

/**
 * Function type for custom tenant extraction
 */
export type CustomTenantExtractor = (request: Request) => null | Promise<null | string> | string;

/**
 * Function type for resolving tenant data from an identifier
 */
export type TenantResolver = (tenantId: string) => null | Promise<null | Tenant> | Tenant;

/**
 * Configuration options for the MultiTenantModule
 */
export interface MultiTenantModuleOptions {
  /**
   * Custom extractor function (when using 'custom' strategy)
   */
  customExtractor?: CustomTenantExtractor;

  /**
   * Routes to exclude from tenant extraction (regex patterns)
   */
  excludeRoutes?: (RegExp | string)[];

  /**
   * Strategy for extracting tenant identifier
   * @default 'header'
   */
  extractionStrategy?: TenantExtractionStrategy;

  /**
   * Whether to throw an error if tenant cannot be determined
   * @default false
   */
  requireTenant?: boolean;

  /**
   * Cookie name to extract tenant ID from (when using 'cookie' strategy)
   * @default 'tenant_id'
   */
  tenantCookie?: string;

  /**
   * Header name to extract tenant ID from (when using 'header' strategy)
   * @default 'x-tenant-id'
   */
  tenantHeader?: string;

  /**
   * JWT claim path to extract tenant ID from (when using 'jwt' strategy)
   * Supports dot notation for nested claims (e.g., 'user.tenantId', 'org.id')
   * @default 'tenantId'
   */
  jwtTenantClaim?: string;

  /**
   * Path segment index to extract tenant ID from (when using 'path' strategy)
   * @default 0
   */
  tenantPathIndex?: number;

  /**
   * Query parameter name to extract tenant ID from (when using 'query' strategy)
   * @default 'tenantId'
   */
  tenantQueryParam?: string;

  /**
   * Function to resolve full tenant data from tenant ID
   * If not provided, tenant will only contain the ID
   */
  tenantResolver?: TenantResolver;
}

/**
 * Module type that can be imported
 */
type ModuleImport = DynamicModule | Promise<DynamicModule> | Type<unknown>;

/**
 * Async configuration options for the MultiTenantModule
 */
export interface MultiTenantModuleAsyncOptions {
  /**
   * Optional module imports
   */
  imports?: ModuleImport[];

  /**
   * Dependencies to inject into the factory function
   */
  inject?: (Abstract<unknown> | InjectionToken | OptionalFactoryDependency | Type<unknown>)[];

  /**
   * Factory function to create options
   */
  useFactory: (...args: unknown[]) => MultiTenantModuleOptions | Promise<MultiTenantModuleOptions>;
}
