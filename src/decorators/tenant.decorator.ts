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
 * Interface for WebSocket client with tenant
 */
interface WsClientWithTenant {
  tenant?: Tenant;
  handshake?: {
    tenant?: Tenant;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  };
  data?: {
    tenant?: Tenant;
  };
}

/**
 * Get tenant from WebSocket client
 * Checks client.tenant, client.handshake.tenant, and client.data.tenant
 */
function getTenantFromWsClient(client: WsClientWithTenant): Tenant | undefined {
  // Check direct tenant property on client
  if (client.tenant) {
    return client.tenant;
  }

  // Check handshake tenant (set during connection)
  if (client.handshake?.tenant) {
    return client.handshake.tenant;
  }

  // Check data tenant (could be set via middleware)
  if (client.data?.tenant) {
    return client.data.tenant;
  }

  return undefined;
}

/**
 * Get the request object from execution context (supports HTTP, GraphQL, and WebSocket)
 */
function getRequestFromContext(ctx: ExecutionContext): RequestWithTenant {
  const contextType = ctx.getType<'http' | 'graphql' | 'rpc' | 'ws'>();

  // Handle WebSocket context
  if (contextType === 'ws') {
    const client = ctx.switchToWs().getClient<WsClientWithTenant>();
    const tenant = getTenantFromWsClient(client);
    return { tenant };
  }

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
 * Parameter decorator to inject the current tenant into a controller method, GraphQL resolver, or WebSocket gateway
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
 *
 * @example WebSocket Gateway
 * ```typescript
 * @SubscribeMessage('message')
 * handleMessage(@CurrentTenant() tenant: Tenant, @MessageBody() data: string) {
 *   return this.chatService.handleMessage(tenant.id, data);
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
 * Parameter decorator to inject only the current tenant ID into a controller method, GraphQL resolver, or WebSocket gateway
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
 *
 * @example WebSocket Gateway
 * ```typescript
 * @SubscribeMessage('join-room')
 * handleJoinRoom(@TenantId() tenantId: string, @MessageBody() roomId: string) {
 *   return this.chatService.joinRoom(tenantId, roomId);
 * }
 * ```
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = getRequestFromContext(ctx);
    return request.tenant?.id;
  },
);
