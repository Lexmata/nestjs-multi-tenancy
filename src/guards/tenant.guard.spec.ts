import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard, REQUIRE_TENANT_KEY } from './tenant.guard';
import { TenantContextService } from '../services';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: Reflector;
  let tenantContext: TenantContextService;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    tenantContext = new TenantContextService();
    guard = new TenantGuard(reflector, tenantContext);

    mockExecutionContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;
  });

  describe('canActivate', () => {
    describe('HTTP context', () => {
      it('should allow access when @RequireTenant is not applied', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should allow access when @RequireTenant is false', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should throw when @RequireTenant is true but no tenant context', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        expect(() => guard.canActivate(mockExecutionContext)).toThrow(HttpException);
        expect(() => guard.canActivate(mockExecutionContext)).toThrow('Tenant context required');
      });

      it('should allow access when @RequireTenant is true and tenant exists', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const result = tenantContext.run({ id: 'tenant-1' }, () => {
          return guard.canActivate(mockExecutionContext);
        });

        expect(result).toBe(true);
      });

      it('should check both handler and class for metadata', () => {
        const getAllAndOverrideSpy = vi
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue(false);

        guard.canActivate(mockExecutionContext);

        expect(getAllAndOverrideSpy).toHaveBeenCalledWith(REQUIRE_TENANT_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
      });
    });

    describe('GraphQL context', () => {
      beforeEach(() => {
        mockExecutionContext = {
          getHandler: vi.fn(),
          getClass: vi.fn(),
          getType: vi.fn().mockReturnValue('graphql'),
          switchToHttp: vi.fn().mockReturnValue({
            getRequest: vi.fn().mockReturnValue({}),
          }),
        } as unknown as ExecutionContext;
      });

      it('should allow access when @RequireTenant is not applied', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should throw GraphQL-specific message when no tenant context', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        try {
          guard.canActivate(mockExecutionContext);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).message).toBe(
            'Tenant context required for this operation',
          );
          expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
        }
      });

      it('should allow access when tenant exists in GraphQL context', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const result = tenantContext.run({ id: 'tenant-gql' }, () => {
          return guard.canActivate(mockExecutionContext);
        });

        expect(result).toBe(true);
      });
    });

    describe('WebSocket context', () => {
      beforeEach(() => {
        mockExecutionContext = {
          getHandler: vi.fn(),
          getClass: vi.fn(),
          getType: vi.fn().mockReturnValue('ws'),
          switchToWs: vi.fn().mockReturnValue({
            getClient: vi.fn().mockReturnValue({}),
            getData: vi.fn().mockReturnValue({}),
          }),
        } as unknown as ExecutionContext;
      });

      it('should allow access when @RequireTenant is not applied', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should throw WebSocket-specific message when no tenant context', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        try {
          guard.canActivate(mockExecutionContext);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).message).toBe(
            'Tenant context required for this WebSocket operation',
          );
          expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
        }
      });

      it('should allow access when tenant exists in WebSocket context', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const result = tenantContext.run({ id: 'tenant-ws' }, () => {
          return guard.canActivate(mockExecutionContext);
        });

        expect(result).toBe(true);
      });
    });

    describe('RPC/Microservice context', () => {
      let mockExecutionContext: ExecutionContext;

      beforeEach(() => {
        mockExecutionContext = {
          getHandler: vi.fn(),
          getClass: vi.fn(),
          getType: vi.fn().mockReturnValue('rpc'),
          switchToRpc: vi.fn().mockReturnValue({
            getData: vi.fn().mockReturnValue({}),
            getContext: vi.fn().mockReturnValue({}),
          }),
        } as unknown as ExecutionContext;
      });

      it('should allow access when @RequireTenant is not applied', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should throw RPC-specific message when no tenant context', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        try {
          guard.canActivate(mockExecutionContext);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).message).toBe(
            'Tenant context required for this microservice operation',
          );
          expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
        }
      });

      it('should allow access when tenant exists in RPC context', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const result = tenantContext.run({ id: 'tenant-rpc' }, () => {
          return guard.canActivate(mockExecutionContext);
        });

        expect(result).toBe(true);
      });
    });
  });
});
