import { describe, expect, it } from 'vitest';
import { requireTenantDecorator } from './require-tenant-decorator';

describe('require-tenant-decorator rule', () => {
  it('should have correct meta configuration', () => {
    expect(requireTenantDecorator.meta).toBeDefined();
    expect(requireTenantDecorator.meta?.type).toBe('suggestion');
    expect(requireTenantDecorator.meta?.fixable).toBe('code');
    expect(requireTenantDecorator.meta?.hasSuggestions).toBe(true);
  });

  it('should have required messages', () => {
    const messages = requireTenantDecorator.meta?.messages;
    expect(messages).toBeDefined();
    expect(messages).toHaveProperty('missingDecorator');
    expect(messages).toHaveProperty('suggestAddDecorator');
  });

  it('should have schema for options', () => {
    const schema = requireTenantDecorator.meta?.schema;
    expect(schema).toBeDefined();
    expect(Array.isArray(schema)).toBe(true);
  });

  it('should have create function', () => {
    expect(typeof requireTenantDecorator.create).toBe('function');
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
    const visitor = requireTenantDecorator.create(mockContext);

    expect(visitor).toBeDefined();
    expect(typeof visitor).toBe('object');
    expect(visitor).toHaveProperty('ClassDeclaration');
    expect(visitor).toHaveProperty('MethodDefinition');
  });
});
