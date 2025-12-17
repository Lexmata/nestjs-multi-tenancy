import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  DEFAULT_CACHE_MAX,
  DEFAULT_CACHE_TTL,
  DEFAULT_JWT_TENANT_CLAIM,
  DEFAULT_TENANT_COOKIE,
  DEFAULT_TENANT_HEADER,
  DEFAULT_TENANT_PATH_INDEX,
  DEFAULT_TENANT_QUERY_PARAM,
  MULTI_TENANT_OPTIONS,
} from '../constants';
import type {
  MultiTenantModuleOptions,
  Tenant,
  TenantEventContext,
  TenantExtractionStrategy,
  TenantValidationResult,
} from '../interfaces';
import { TenantContextService } from '../services';

/**
 * Cache entry with expiration time
 */
interface CacheEntry {
  tenant: Tenant;
  expiresAt: number;
}

/**
 * Middleware that extracts tenant information from incoming requests
 * and establishes the tenant context for the request lifecycle
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger('MultiTenant');
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheEnabled: boolean;
  private readonly cacheTtl: number;
  private readonly cacheMax: number;
  private readonly debug: boolean;

  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(MULTI_TENANT_OPTIONS)
    private readonly options: MultiTenantModuleOptions,
  ) {
    // Initialize cache settings
    this.cacheEnabled = options.tenantResolverCache?.enabled ?? false;
    this.cacheTtl = options.tenantResolverCache?.ttl ?? DEFAULT_CACHE_TTL;
    this.cacheMax = options.tenantResolverCache?.max ?? DEFAULT_CACHE_MAX;
    this.debug = options.debug ?? false;

    if (this.debug) {
      this.logger.debug('MultiTenant middleware initialized');
      this.logger.debug(`  Strategy: ${options.extractionStrategy ?? 'header'}`);
      this.logger.debug(`  Require tenant: ${String(options.requireTenant ?? false)}`);
      this.logger.debug(`  Cache enabled: ${String(this.cacheEnabled)}`);
      if (this.cacheEnabled) {
        this.logger.debug(`  Cache TTL: ${String(this.cacheTtl)}ms`);
        this.logger.debug(`  Cache max: ${String(this.cacheMax)}`);
      }
    }
  }

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const method = req.method;
    const path = req.path;

    // Check if route is excluded
    if (this.isRouteExcluded(path)) {
      this.log(`[${method} ${path}] Route excluded from tenant extraction`);
      next();
      return;
    }

    const strategy = this.options.extractionStrategy ?? 'header';
    const context = this.createEventContext(req, strategy);

    this.log(`[${method} ${path}] Extracting tenant using '${strategy}' strategy`);
    const tenantId = await this.extractTenantId(req);

    if (!tenantId) {
      this.log(`[${method} ${path}] No tenant ID found`);
      // Trigger onTenantMissing hook
      await this.triggerOnTenantMissing(context);

      if (this.options.requireTenant) {
        this.log(`[${method} ${path}] Tenant required - rejecting request (400)`);
        throw new HttpException('Tenant identification required', HttpStatus.BAD_REQUEST);
      }
      this.log(`[${method} ${path}] Continuing without tenant`);
      next();
      return;
    }

    this.log(`[${method} ${path}] Tenant ID extracted: ${tenantId}`);

    // Trigger onTenantIdExtracted hook
    await this.triggerOnTenantIdExtracted(tenantId, context);

    // Resolve full tenant data if resolver is provided
    let tenant: Tenant;
    if (this.options.tenantResolver) {
      this.log(`[${method} ${path}] Resolving tenant data for: ${tenantId}`);
      const resolved = await this.resolveTenant(tenantId);
      if (!resolved) {
        this.log(`[${method} ${path}] Tenant not found: ${tenantId}`);
        // Trigger onTenantNotFound hook
        await this.triggerOnTenantNotFound(tenantId, context);

        if (this.options.requireTenant) {
          this.log(`[${method} ${path}] Tenant required - rejecting request (404)`);
          throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
        }
        this.log(`[${method} ${path}] Continuing without tenant`);
        next();
        return;
      }
      tenant = resolved;
      this.log(`[${method} ${path}] Tenant resolved: ${tenant.id} (${tenant.name ?? 'unnamed'})`);
    } else {
      tenant = { id: tenantId };
      this.log(`[${method} ${path}] Using ID-only tenant: ${tenantId}`);
    }

    // Validate tenant if validator is provided
    if (this.options.tenantValidator) {
      this.log(`[${method} ${path}] Validating tenant: ${tenant.id}`);
      const validationResult = await this.validateTenant(tenant, context);
      if (!validationResult.valid) {
        const reason = validationResult.reason ?? 'Tenant validation failed';
        this.log(`[${method} ${path}] Validation failed: ${reason}`);
        // Trigger onTenantValidationFailed hook
        await this.triggerOnTenantValidationFailed(tenant, validationResult.reason, context);

        if (this.options.requireTenant) {
          this.log(`[${method} ${path}] Tenant required - rejecting request (403)`);
          throw new HttpException(reason, HttpStatus.FORBIDDEN);
        }
        this.log(`[${method} ${path}] Continuing without tenant`);
        next();
        return;
      }
      this.log(`[${method} ${path}] Validation passed`);
    }

    // Trigger onTenantResolved hook
    await this.triggerOnTenantResolved(tenant, context);

    this.log(`[${method} ${path}] Setting tenant context: ${tenant.id}`);

    // Run the rest of the request within the tenant context
    this.tenantContext.run(tenant, () => {
      next();
    });
  }

  /**
   * Log a debug message if debug mode is enabled
   */
  private log(message: string): void {
    if (this.debug) {
      this.logger.debug(message);
    }
  }

  /**
   * Resolve tenant data with optional caching
   */
  private async resolveTenant(tenantId: string): Promise<null | Tenant> {
    const resolver = this.options.tenantResolver;
    if (!resolver) {
      return null;
    }

    // Check cache first if enabled
    if (this.cacheEnabled) {
      const cached = this.getFromCache(tenantId);
      if (cached) {
        this.log(`Cache hit for tenant: ${tenantId}`);
        return cached;
      }
      this.log(`Cache miss for tenant: ${tenantId}`);
    }

    // Call the resolver
    const resolved = await resolver(tenantId);

    // Cache the result if enabled and tenant was found
    if (this.cacheEnabled && resolved) {
      this.setInCache(tenantId, resolved);
      this.log(`Cached tenant: ${tenantId} (expires in ${String(this.cacheTtl)}ms)`);
    }

    return resolved;
  }

  /**
   * Get tenant from cache if valid
   */
  private getFromCache(tenantId: string): null | Tenant {
    const entry = this.cache.get(tenantId);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(tenantId);
      return null;
    }

    return entry.tenant;
  }

  /**
   * Set tenant in cache with TTL
   */
  private setInCache(tenantId: string, tenant: Tenant): void {
    // Enforce max cache size (simple LRU: delete oldest when full)
    if (this.cache.size >= this.cacheMax) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(tenantId, {
      tenant,
      expiresAt: Date.now() + this.cacheTtl,
    });
  }

  /**
   * Clear the tenant cache
   * Useful for testing or when tenant data is updated
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate a specific tenant from cache
   */
  invalidateTenant(tenantId: string): boolean {
    return this.cache.delete(tenantId);
  }

  /**
   * Get current cache statistics
   */
  getCacheStats(): { enabled: boolean; max: number; size: number; ttl: number } {
    return {
      enabled: this.cacheEnabled,
      size: this.cache.size,
      max: this.cacheMax,
      ttl: this.cacheTtl,
    };
  }

  /**
   * Extract tenant ID from the request based on the configured strategy
   */
  private async extractTenantId(req: Request): Promise<null | string> {
    const strategy = this.options.extractionStrategy ?? 'header';

    switch (strategy) {
      case 'header':
        return this.extractFromHeader(req);
      case 'subdomain':
        return this.extractFromSubdomain(req);
      case 'path':
        return this.extractFromPath(req);
      case 'query':
        return this.extractFromQuery(req);
      case 'cookie':
        return this.extractFromCookie(req);
      case 'jwt':
        return this.extractFromJwt(req);
      case 'bearer':
        return this.extractFromBearer(req);
      case 'custom':
        return this.extractCustom(req);
      default:
        return null;
    }
  }

  /**
   * Extract tenant ID from request header
   */
  private extractFromHeader(req: Request): null | string {
    const headerName = this.options.tenantHeader ?? DEFAULT_TENANT_HEADER;
    const value = req.headers[headerName.toLowerCase()];
    return typeof value === 'string' ? value : null;
  }

  /**
   * Extract tenant ID from subdomain
   * e.g., tenant1.example.com -> tenant1
   */
  private extractFromSubdomain(req: Request): null | string {
    const hostHeader = req.headers.host;
    const host = req.hostname || (typeof hostHeader === 'string' ? hostHeader : '');
    const parts = host.split('.');

    // Assumes format: subdomain.domain.tld
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  }

  /**
   * Extract tenant ID from URL path
   * e.g., /tenant1/api/users -> tenant1
   */
  private extractFromPath(req: Request): null | string {
    const pathIndex = this.options.tenantPathIndex ?? DEFAULT_TENANT_PATH_INDEX;
    const parts = req.path.split('/').filter(Boolean);

    if (parts.length > pathIndex) {
      return parts[pathIndex];
    }
    return null;
  }

  /**
   * Extract tenant ID from query parameter
   * e.g., /api/users?tenantId=tenant1 -> tenant1
   */
  private extractFromQuery(req: Request): null | string {
    const paramName = this.options.tenantQueryParam ?? DEFAULT_TENANT_QUERY_PARAM;
    const value = req.query[paramName];
    return typeof value === 'string' ? value : null;
  }

  /**
   * Extract tenant ID from cookie
   * e.g., Cookie: tenant_id=tenant1 -> tenant1
   */
  private extractFromCookie(req: Request): null | string {
    const cookieName = this.options.tenantCookie ?? DEFAULT_TENANT_COOKIE;
    const cookies = req.cookies as Record<string, string> | undefined;

    if (!cookies) {
      // Fallback: parse cookies from header if cookie-parser middleware is not used
      const cookieHeader = req.headers.cookie;
      if (typeof cookieHeader === 'string') {
        const parsed = this.parseCookieHeader(cookieHeader);
        return parsed[cookieName] ?? null;
      }
      return null;
    }

    const value = cookies[cookieName];
    return typeof value === 'string' ? value : null;
  }

  /**
   * Parse cookie header string into key-value pairs
   * Used as fallback when cookie-parser middleware is not available
   */
  private parseCookieHeader(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    for (const pair of cookieHeader.split(';')) {
      const [key, ...valueParts] = pair.trim().split('=');
      if (key) {
        cookies[key] = valueParts.join('=');
      }
    }
    return cookies;
  }

  /**
   * Extract tenant ID from JWT token in Authorization header
   * Supports Bearer tokens and decodes without verification
   * (verification should be handled by auth guards)
   */
  private extractFromJwt(req: Request): null | string {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string') {
      return null;
    }

    // Extract token from Bearer scheme (case-insensitive)
    const lowerAuth = authHeader.toLowerCase();
    if (!lowerAuth.startsWith('bearer ')) {
      return null;
    }
    const token = authHeader.slice(7); // Remove "Bearer " prefix

    if (!token) {
      return null;
    }

    // Decode JWT payload (without verification)
    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return null;
    }

    // Get tenant ID from configured claim path
    const claimPath = this.options.jwtTenantClaim ?? DEFAULT_JWT_TENANT_CLAIM;
    const tenantId = this.getNestedValue(payload, claimPath);

    return typeof tenantId === 'string' ? tenantId : null;
  }

  /**
   * Decode JWT payload without verification
   * Returns null if token is invalid or malformed
   */
  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode base64url payload (second part)
      const payload = parts[1];
      const base64 = payload.replaceAll('-', '+').replaceAll('_', '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(jsonPayload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Get a nested value from an object using dot notation
   * e.g., getNestedValue({ user: { tenantId: '123' } }, 'user.tenantId') => '123'
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Extract tenant ID from bearer token using resolver function
   * Used for opaque tokens like API keys that require database lookup
   */
  private async extractFromBearer(req: Request): Promise<null | string> {
    if (!this.options.bearerTokenResolver) {
      return null;
    }

    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string') {
      return null;
    }

    // Extract token from Bearer scheme (case-insensitive)
    const lowerAuth = authHeader.toLowerCase();
    if (!lowerAuth.startsWith('bearer ')) {
      return null;
    }
    const token = authHeader.slice(7); // Remove "Bearer " prefix

    if (!token) {
      return null;
    }

    // Use resolver to get tenant ID from token
    return this.options.bearerTokenResolver(token);
  }

  /**
   * Extract tenant ID using custom extractor function
   */
  private async extractCustom(req: Request): Promise<null | string> {
    if (!this.options.customExtractor) {
      return null;
    }
    return this.options.customExtractor(req as unknown as globalThis.Request);
  }

  /**
   * Check if the current route should be excluded from tenant extraction
   */
  private isRouteExcluded(path: string): boolean {
    if (!this.options.excludeRoutes?.length) {
      return false;
    }

    return this.options.excludeRoutes.some((pattern) => {
      if (typeof pattern === 'string') {
        return path === pattern || path.startsWith(pattern);
      }
      return pattern.test(path);
    });
  }

  /**
   * Create event context object
   */
  private createEventContext(req: Request, strategy: TenantExtractionStrategy): TenantEventContext {
    return {
      request: req,
      strategy,
      path: req.path,
    };
  }

  /**
   * Trigger onTenantIdExtracted hook
   */
  private async triggerOnTenantIdExtracted(
    tenantId: string,
    context: TenantEventContext,
  ): Promise<void> {
    const hook = this.options.eventHooks?.onTenantIdExtracted;
    if (hook) {
      await hook(tenantId, context);
    }
  }

  /**
   * Trigger onTenantResolved hook
   */
  private async triggerOnTenantResolved(
    tenant: Tenant,
    context: TenantEventContext,
  ): Promise<void> {
    const hook = this.options.eventHooks?.onTenantResolved;
    if (hook) {
      await hook(tenant, context);
    }
  }

  /**
   * Trigger onTenantNotFound hook
   */
  private async triggerOnTenantNotFound(
    tenantId: string,
    context: TenantEventContext,
  ): Promise<void> {
    const hook = this.options.eventHooks?.onTenantNotFound;
    if (hook) {
      await hook(tenantId, context);
    }
  }

  /**
   * Trigger onTenantMissing hook
   */
  private async triggerOnTenantMissing(context: TenantEventContext): Promise<void> {
    const hook = this.options.eventHooks?.onTenantMissing;
    if (hook) {
      await hook(context);
    }
  }

  /**
   * Trigger onTenantValidationFailed hook
   */
  private async triggerOnTenantValidationFailed(
    tenant: Tenant,
    reason: string | undefined,
    context: TenantEventContext,
  ): Promise<void> {
    const hook = this.options.eventHooks?.onTenantValidationFailed;
    if (hook) {
      await hook(tenant, reason, context);
    }
  }

  /**
   * Validate tenant using the configured validator
   */
  private async validateTenant(
    tenant: Tenant,
    context: TenantEventContext,
  ): Promise<TenantValidationResult> {
    const validator = this.options.tenantValidator;
    if (!validator) {
      return { valid: true };
    }

    const result = await validator(tenant, context);

    // Handle boolean result
    if (typeof result === 'boolean') {
      return { valid: result };
    }

    // Handle TenantValidationResult
    return result;
  }
}
