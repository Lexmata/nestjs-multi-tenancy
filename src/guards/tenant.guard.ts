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
 * Works with REST controllers, GraphQL resolvers, WebSocket gateways, and microservice handlers.
 * Use with @RequireTenant() decorator on controllers, resolvers, gateways, handlers, or methods.
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
 *
 * @example WebSocket Gateway
 * ```typescript
 * @WebSocketGateway()
 * @UseGuards(TenantGuard)
 * @RequireTenant()
 * export class ChatGateway {}
 * ```
 *
 * @example Microservice Controller
 * ```typescript
 * @Controller()
 * @UseGuards(TenantGuard)
 * @RequireTenant()
 * export class UsersHandler {}
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

      // Context-specific error messages
      switch (contextType) {
        case 'graphql':
          throw new HttpException(
            'Tenant context required for this operation',
            HttpStatus.FORBIDDEN,
          );
        case 'ws':
          throw new HttpException(
            'Tenant context required for this WebSocket operation',
            HttpStatus.FORBIDDEN,
          );
        case 'rpc':
          throw new HttpException(
            'Tenant context required for this microservice operation',
            HttpStatus.FORBIDDEN,
          );
        default:
          throw new HttpException('Tenant context required', HttpStatus.FORBIDDEN);
      }
    }

    return true;
  }
}
