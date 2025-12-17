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
  | 'bearer'
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
 * Function type for resolving tenant ID from a bearer token
 * Used for opaque tokens like API keys
 */
export type BearerTokenResolver = (token: string) => null | Promise<null | string> | string;

/**
 * Function type for resolving tenant data from an identifier
 */
export type TenantResolver = (tenantId: string) => null | Promise<null | Tenant> | Tenant;

/**
 * Context passed to event hooks
 */
export interface TenantEventContext {
  /**
   * The HTTP request object (Express Request or similar)
   */
  request: unknown;

  /**
   * The extraction strategy used
   */
  strategy: TenantExtractionStrategy;

  /**
   * Request path
   */
  path: string;
}

/**
 * Event hook called when tenant ID is extracted from request
 */
export type OnTenantIdExtracted = (
  tenantId: string,
  context: TenantEventContext,
) => Promise<void> | void;

/**
 * Event hook called when tenant is successfully resolved
 */
export type OnTenantResolved = (
  tenant: Tenant,
  context: TenantEventContext,
) => Promise<void> | void;

/**
 * Event hook called when tenant ID was extracted but resolver returned null
 */
export type OnTenantNotFound = (
  tenantId: string,
  context: TenantEventContext,
) => Promise<void> | void;

/**
 * Event hook called when no tenant ID could be extracted from request
 */
export type OnTenantMissing = (context: TenantEventContext) => Promise<void> | void;

/**
 * Result of tenant validation
 */
export interface TenantValidationResult {
  /**
   * Whether the tenant is valid
   */
  valid: boolean;

  /**
   * Optional reason for rejection (used in error message)
   */
  reason?: string;
}

/**
 * Function type for validating a tenant
 * Return true/false, or TenantValidationResult for custom error messages
 * Can also throw an error directly to reject with custom status code
 */
export type TenantValidator = (
  tenant: Tenant,
  context: TenantEventContext,
) => boolean | Promise<boolean | TenantValidationResult> | TenantValidationResult;

/**
 * Event hook called when tenant validation fails
 */
export type OnTenantValidationFailed = (
  tenant: Tenant,
  reason: string | undefined,
  context: TenantEventContext,
) => Promise<void> | void;

/**
 * Lifecycle event hooks configuration
 */
export interface TenantEventHooks {
  /**
   * Called when tenant ID is extracted from request (before resolution)
   */
  onTenantIdExtracted?: OnTenantIdExtracted;

  /**
   * Called when no tenant ID could be extracted from request
   */
  onTenantMissing?: OnTenantMissing;

  /**
   * Called when tenant ID was extracted but resolver returned null
   */
  onTenantNotFound?: OnTenantNotFound;

  /**
   * Called when tenant is successfully resolved
   */
  onTenantResolved?: OnTenantResolved;

  /**
   * Called when tenant validation fails
   */
  onTenantValidationFailed?: OnTenantValidationFailed;
}

/**
 * Cache configuration options for tenant resolver
 */
export interface TenantCacheOptions {
  /**
   * Whether caching is enabled
   * @default false
   */
  enabled?: boolean;

  /**
   * Maximum number of tenants to cache
   * @default 1000
   */
  max?: number;

  /**
   * Time-to-live in milliseconds
   * @default 300000 (5 minutes)
   */
  ttl?: number;
}

/**
 * Configuration options for the MultiTenantModule
 */
export interface MultiTenantModuleOptions {
  /**
   * Function to resolve tenant ID from bearer token (when using 'bearer' strategy)
   * Use this for opaque tokens like API keys that need database lookup
   */
  bearerTokenResolver?: BearerTokenResolver;

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

  /**
   * Cache configuration for tenant resolver results
   * Caches resolved tenant data to avoid repeated lookups
   */
  tenantResolverCache?: TenantCacheOptions;

  /**
   * Event hooks for tenant lifecycle events
   * Useful for logging, metrics, and custom logic
   */
  eventHooks?: TenantEventHooks;

  /**
   * Function to validate tenant before allowing request
   * Return true to allow, false to reject
   * Can return TenantValidationResult for custom error messages
   * Can also throw HttpException for custom status codes
   */
  tenantValidator?: TenantValidator;

  /**
   * Enable debug logging for tenant extraction
   * Logs detailed information about extraction, resolution, and validation
   * @default false
   */
  debug?: boolean;
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
