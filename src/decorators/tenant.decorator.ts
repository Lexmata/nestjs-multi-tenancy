import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Tenant } from '../interfaces';

/**
 * Interface for request object with tenant
 */
interface RequestWithTenant {
  tenant?: Tenant;
}

/**
 * Get the request object from execution context (supports HTTP and GraphQL)
 */
function getRequestFromContext(ctx: ExecutionContext): RequestWithTenant {
  const contextType = ctx.getType<'http' | 'graphql' | 'rpc' | 'ws'>();

  // Handle GraphQL context
  if (contextType === 'graphql') {
    try {
      // Dynamically import GqlExecutionContext to avoid hard dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GqlExecutionContext } = require('@nestjs/graphql') as {
        GqlExecutionContext: {
          create: (ctx: ExecutionContext) => { getContext: () => { req: RequestWithTenant } };
        };
      };
      const gqlContext = GqlExecutionContext.create(ctx);
      return gqlContext.getContext().req;
    } catch {
      // @nestjs/graphql not installed, fall back to HTTP
      return ctx.switchToHttp().getRequest<RequestWithTenant>();
    }
  }

  // Handle HTTP context (default)
  return ctx.switchToHttp().getRequest<RequestWithTenant>();
}

/**
 * Parameter decorator to inject the current tenant into a controller method or GraphQL resolver
 *
 * @example REST Controller
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentTenant() tenant: Tenant) {
 *   return this.service.getProfile(tenant.id);
 * }
 * ```
 *
 * @example GraphQL Resolver
 * ```typescript
 * @Query(() => User)
 * async me(@CurrentTenant() tenant: Tenant) {
 *   return this.userService.findByTenant(tenant.id);
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Tenant | undefined => {
    const request = getRequestFromContext(ctx);
    return request.tenant;
  },
);

/**
 * Parameter decorator to inject only the current tenant ID into a controller method or GraphQL resolver
 *
 * @example REST Controller
 * ```typescript
 * @Get('profile')
 * getProfile(@TenantId() tenantId: string) {
 *   return this.service.getProfile(tenantId);
 * }
 * ```
 *
 * @example GraphQL Resolver
 * ```typescript
 * @Query(() => [User])
 * async users(@TenantId() tenantId: string) {
 *   return this.userService.findAllByTenant(tenantId);
 * }
 * ```
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = getRequestFromContext(ctx);
    return request.tenant?.id;
  },
);
