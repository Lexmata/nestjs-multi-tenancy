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
 * Interface for RPC/Microservice data with tenant
 */
interface RpcDataWithTenant {
  tenant?: Tenant;
  tenantId?: string;
}

/**
 * Interface for RPC/Microservice context with tenant
 */
interface RpcContextWithTenant {
  tenant?: Tenant;
  getTenant?: () => Tenant | undefined;
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
 * Get tenant from RPC/Microservice context
 * Checks data.tenant, data.tenantId, and context.tenant
 */
function getTenantFromRpc(
  data: RpcDataWithTenant | undefined,
  rpcContext: RpcContextWithTenant | undefined,
): Tenant | undefined {
  // Check data.tenant (full tenant object in message payload)
  if (data?.tenant) {
    return data.tenant;
  }

  // Check data.tenantId (just ID in payload, wrap it)
  if (data?.tenantId) {
    return { id: data.tenantId };
  }

  // Check context.tenant (set by interceptor or middleware)
  if (rpcContext?.tenant) {
    return rpcContext.tenant;
  }

  // Check context.getTenant() method
  if (rpcContext?.getTenant) {
    return rpcContext.getTenant();
  }

  return undefined;
}

/**
 * Get the request object from execution context (supports HTTP, GraphQL, WebSocket, and RPC/Microservices)
 */
function getRequestFromContext(ctx: ExecutionContext): RequestWithTenant {
  const contextType = ctx.getType<'http' | 'graphql' | 'rpc' | 'ws'>();

  // Handle RPC/Microservice context
  if (contextType === 'rpc') {
    const rpcCtx = ctx.switchToRpc();
    const data = rpcCtx.getData<RpcDataWithTenant>();
    const rpcContext = rpcCtx.getContext<RpcContextWithTenant>();
    const tenant = getTenantFromRpc(data, rpcContext);
    return { tenant };
  }

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
 * Parameter decorator to inject the current tenant into a controller method, GraphQL resolver, WebSocket gateway, or microservice handler
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
 *
 * @example Microservice Handler
 * ```typescript
 * @MessagePattern('user.create')
 * createUser(@CurrentTenant() tenant: Tenant, @Payload() data: CreateUserDto) {
 *   return this.userService.create(tenant.id, data);
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
 * Parameter decorator to inject only the current tenant ID into a controller method, GraphQL resolver, WebSocket gateway, or microservice handler
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
 *
 * @example Microservice Handler
 * ```typescript
 * @EventPattern('order.created')
 * handleOrderCreated(@TenantId() tenantId: string, @Payload() data: OrderDto) {
 *   return this.orderService.process(tenantId, data);
 * }
 * ```
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = getRequestFromContext(ctx);
    return request.tenant?.id;
  },
);
