import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../services';

/**
 * Metadata key for requiring tenant
 */
export const REQUIRE_TENANT_KEY = 'requireTenant';

/**
 * Guard that ensures a valid tenant context exists for the request.
 * Works with both REST controllers and GraphQL resolvers.
 * Use with @RequireTenant() decorator on controllers, resolvers, or methods.
 *
 * @example REST Controller
 * ```typescript
 * @Controller('users')
 * @UseGuards(TenantGuard)
 * @RequireTenant()
 * export class UsersController {}
 * ```
 *
 * @example GraphQL Resolver
 * ```typescript
 * @Resolver(() => User)
 * @UseGuards(TenantGuard)
 * @RequireTenant()
 * export class UsersResolver {}
 * ```
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requireTenant = this.reflector.getAllAndOverride<boolean>(REQUIRE_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If @RequireTenant() is not applied, allow the request
    if (!requireTenant) {
      return true;
    }

    // Check if tenant context exists
    if (!this.tenantContext.hasTenant()) {
      const contextType = context.getType<'http' | 'graphql' | 'rpc' | 'ws'>();

      // For GraphQL, throw a more appropriate error
      if (contextType === 'graphql') {
        throw new HttpException('Tenant context required for this operation', HttpStatus.FORBIDDEN);
      }

      throw new HttpException('Tenant context required', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
