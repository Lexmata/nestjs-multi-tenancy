import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  DEFAULT_JWT_TENANT_CLAIM,
  DEFAULT_TENANT_COOKIE,
  DEFAULT_TENANT_HEADER,
  DEFAULT_TENANT_PATH_INDEX,
  DEFAULT_TENANT_QUERY_PARAM,
  MULTI_TENANT_OPTIONS,
} from '../constants';
import type { MultiTenantModuleOptions, Tenant } from '../interfaces';
import { TenantContextService } from '../services';

/**
 * Middleware that extracts tenant information from incoming requests
 * and establishes the tenant context for the request lifecycle
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(MULTI_TENANT_OPTIONS)
    private readonly options: MultiTenantModuleOptions,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Check if route is excluded
    if (this.isRouteExcluded(req.path)) {
      next();
      return;
    }

    const tenantId = await this.extractTenantId(req);

    if (!tenantId) {
      if (this.options.requireTenant) {
        throw new HttpException('Tenant identification required', HttpStatus.BAD_REQUEST);
      }
      next();
      return;
    }

    // Resolve full tenant data if resolver is provided
    let tenant: Tenant;
    if (this.options.tenantResolver) {
      const resolved = await this.options.tenantResolver(tenantId);
      if (!resolved) {
        if (this.options.requireTenant) {
          throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
        }
        next();
        return;
      }
      tenant = resolved;
    } else {
      tenant = { id: tenantId };
    }

    // Run the rest of the request within the tenant context
    this.tenantContext.run(tenant, () => {
      next();
    });
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
}
