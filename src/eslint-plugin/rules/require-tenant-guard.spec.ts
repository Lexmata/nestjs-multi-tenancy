import { describe, expect, it } from 'vitest';
import { requireTenantGuard } from './require-tenant-guard';

describe('require-tenant-guard rule', () => {
  it('should have correct meta configuration', () => {
    expect(requireTenantGuard.meta).toBeDefined();
    expect(requireTenantGuard.meta?.type).toBe('suggestion');
    expect(requireTenantGuard.meta?.fixable).toBe('code');
    expect(requireTenantGuard.meta?.hasSuggestions).toBe(true);
  });

  it('should have required messages', () => {
    const messages = requireTenantGuard.meta?.messages;
    expect(messages).toBeDefined();
    expect(messages).toHaveProperty('missingGuard');
    expect(messages).toHaveProperty('suggestAddGuard');
    expect(messages).toHaveProperty('suggestAddDecorator');
  });

  it('should have schema for options', () => {
    const schema = requireTenantGuard.meta?.schema;
    expect(schema).toBeDefined();
    expect(Array.isArray(schema)).toBe(true);
  });

  it('should have create function', () => {
    expect(typeof requireTenantGuard.create).toBe('function');
  });

  it('should return visitor object from create', () => {
    const mockContext = {
      options: [{}],
      sourceCode: {
        lines: [],
        getIndexFromLoc: () => 0,
      },
    };

    // @ts-expect-error - minimal mock for testing
    const visitor = requireTenantGuard.create(mockContext);

    expect(visitor).toBeDefined();
    expect(typeof visitor).toBe('object');
    expect(visitor).toHaveProperty('ImportDeclaration');
    expect(visitor).toHaveProperty('ClassDeclaration');
    expect(visitor).toHaveProperty('CallExpression');
  });
});
