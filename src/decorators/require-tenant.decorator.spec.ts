import { describe, it, expect } from 'vitest';
import { RequireTenant } from './require-tenant.decorator';
import { REQUIRE_TENANT_KEY } from '../guards/tenant.guard';

describe('RequireTenant Decorator', () => {
  it('should set metadata with REQUIRE_TENANT_KEY', () => {
    @RequireTenant()
    class TestController {}

    const metadata = Reflect.getMetadata(REQUIRE_TENANT_KEY, TestController);
    expect(metadata).toBe(true);
  });

  it('should work on methods', () => {
    class TestController {
      @RequireTenant()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(REQUIRE_TENANT_KEY, TestController.prototype.testMethod);
    expect(metadata).toBe(true);
  });

  it('should not set metadata on undecorated classes', () => {
    class UndecoratedController {}

    const metadata = Reflect.getMetadata(REQUIRE_TENANT_KEY, UndecoratedController);
    expect(metadata).toBeUndefined();
  });

  it('should not set metadata on undecorated methods', () => {
    class TestController {
      undecoratedMethod() {}
    }

    const metadata = Reflect.getMetadata(
      REQUIRE_TENANT_KEY,
      TestController.prototype.undecoratedMethod,
    );
    expect(metadata).toBeUndefined();
  });

  it('should allow multiple decorators on different methods', () => {
    class TestController {
      @RequireTenant()
      protectedMethod() {}

      publicMethod() {}
    }

    const protectedMetadata = Reflect.getMetadata(
      REQUIRE_TENANT_KEY,
      TestController.prototype.protectedMethod,
    );
    const publicMetadata = Reflect.getMetadata(
      REQUIRE_TENANT_KEY,
      TestController.prototype.publicMethod,
    );

    expect(protectedMetadata).toBe(true);
    expect(publicMetadata).toBeUndefined();
  });
});
