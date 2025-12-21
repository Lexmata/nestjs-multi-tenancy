import { describe, it, expect, beforeEach } from 'vitest';
import { TenantContextService } from './tenant-context.service';
import { Tenant } from '../interfaces';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    service = new TenantContextService();
  });

  describe('run', () => {
    it('should execute function within tenant context', () => {
      const tenant: Tenant = { id: 'tenant-1', name: 'Test Tenant' };

      const result = service.run(tenant, () => {
        return service.getTenant();
      });

      expect(result).toEqual(tenant);
    });

    it('should return the result of the executed function', () => {
      const tenant: Tenant = { id: 'tenant-1' };

      const result = service.run(tenant, () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });

    it('should support nested contexts', () => {
      const tenant1: Tenant = { id: 'tenant-1' };
      const tenant2: Tenant = { id: 'tenant-2' };

      service.run(tenant1, () => {
        expect(service.getTenantId()).toBe('tenant-1');

        service.run(tenant2, () => {
          expect(service.getTenantId()).toBe('tenant-2');
        });

        // Back to tenant1 context
        expect(service.getTenantId()).toBe('tenant-1');
      });
    });
  });

  describe('getTenant', () => {
    it('should return undefined when not in a tenant context', () => {
      expect(service.getTenant()).toBeUndefined();
    });

    it('should return the current tenant when in context', () => {
      const tenant: Tenant = { id: 'tenant-1', name: 'Test' };

      service.run(tenant, () => {
        expect(service.getTenant()).toEqual(tenant);
      });
    });
  });

  describe('getTenantId', () => {
    it('should return undefined when not in a tenant context', () => {
      expect(service.getTenantId()).toBeUndefined();
    });

    it('should return the current tenant ID when in context', () => {
      const tenant: Tenant = { id: 'tenant-123' };

      service.run(tenant, () => {
        expect(service.getTenantId()).toBe('tenant-123');
      });
    });
  });

  describe('hasTenant', () => {
    it('should return false when not in a tenant context', () => {
      expect(service.hasTenant()).toBe(false);
    });

    it('should return true when in a tenant context', () => {
      const tenant: Tenant = { id: 'tenant-1' };

      service.run(tenant, () => {
        expect(service.hasTenant()).toBe(true);
      });
    });
  });

  describe('async operations', () => {
    it('should maintain context across async operations', async () => {
      const tenant: Tenant = { id: 'async-tenant' };

      await service.run(tenant, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(service.getTenantId()).toBe('async-tenant');
      });
    });
  });
});
