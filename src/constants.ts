/**
 * Injection token for MultiTenant module options
 */
export const MULTI_TENANT_OPTIONS = 'MULTI_TENANT_OPTIONS';

/**
 * Default header name for tenant ID extraction
 */
export const DEFAULT_TENANT_HEADER = 'x-tenant-id';

/**
 * Default query parameter name for tenant ID extraction
 */
export const DEFAULT_TENANT_QUERY_PARAM = 'tenantId';

/**
 * Default path segment index for tenant ID extraction
 */
export const DEFAULT_TENANT_PATH_INDEX = 0;

/**
 * Default cookie name for tenant ID extraction
 */
export const DEFAULT_TENANT_COOKIE = 'tenant_id';

/**
 * Default JWT claim path for tenant ID extraction
 */
export const DEFAULT_JWT_TENANT_CLAIM = 'tenantId';

/**
 * Default cache TTL in milliseconds (5 minutes)
 */
export const DEFAULT_CACHE_TTL = 300_000;

/**
 * Default maximum cache size
 */
export const DEFAULT_CACHE_MAX = 1000;
