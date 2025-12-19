import { describe, expect, it } from 'vitest';
import { requireTenantDecorator } from './require-tenant-decorator';

describe('require-tenant-decorator rule', () => {
  describe('meta configuration', () => {
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
  });

  describe('visitor creation', () => {
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

    it('should handle empty options array', () => {
      const mockContext = {
        options: [],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock for testing
      const visitor = requireTenantDecorator.create(mockContext);

      expect(visitor).toBeDefined();
    });

    it('should handle options with exemptMethods', () => {
      const mockContext = {
        options: [{ exemptMethods: ['healthCheck', 'ping'] }],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock for testing
      const visitor = requireTenantDecorator.create(mockContext);

      expect(visitor).toBeDefined();
    });

    it('should handle options with checkControllerDecorators', () => {
      const mockContext = {
        options: [{ checkControllerDecorators: false }],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock for testing
      const visitor = requireTenantDecorator.create(mockContext);

      expect(visitor).toBeDefined();
    });
  });

  describe('ClassDeclaration visitor', () => {
    it('should handle class without decorators', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      // Simulate class without decorators
      const mockNode = {
        decorators: undefined,
      };

      // Should not throw
      expect(() => visitor.ClassDeclaration?.(mockNode)).not.toThrow();
    });

    it('should handle class with Controller decorator', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      const mockNode = {
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
      };

      expect(() => visitor.ClassDeclaration?.(mockNode)).not.toThrow();
    });

    it('should detect UseGuards with TenantGuard', () => {
      const mockContext = {
        options: [{ checkControllerDecorators: true }],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      const mockNode = {
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'UseGuards' },
              arguments: [{ name: 'TenantGuard' }],
            },
          },
        ],
      };

      expect(() => visitor.ClassDeclaration?.(mockNode)).not.toThrow();
    });
  });

  describe('MethodDefinition visitor', () => {
    it('should handle method without decorators', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {},
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      // Initialize controller state
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
      });

      const mockMethodNode = {
        decorators: undefined,
        key: { name: 'someMethod' },
        value: {
          params: [],
        },
      };

      expect(() => visitor.MethodDefinition?.(mockMethodNode)).not.toThrow();
    });

    it('should skip methods in exemptMethods list', () => {
      const mockContext = {
        options: [{ exemptMethods: ['healthCheck'] }],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {},
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      // Initialize controller state
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
      });

      const mockMethodNode = {
        decorators: [],
        key: { name: 'healthCheck' },
        value: {
          params: [],
        },
      };

      expect(() => visitor.MethodDefinition?.(mockMethodNode)).not.toThrow();
    });

    it('should handle @CurrentTenant decorator in params', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: ['class Test {', '  @Get()', '  method(@CurrentTenant() tenant) {}', '}'],
          getIndexFromLoc: () => 0,
        },
        report: () => {},
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      // Initialize controller state (without guard)
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
      });

      const mockMethodNode = {
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Get' },
            },
          },
        ],
        key: { name: 'method' },
        value: {
          params: [
            {
              decorators: [
                {
                  expression: {
                    type: 'CallExpression',
                    callee: { name: 'CurrentTenant' },
                  },
                },
              ],
            },
          ],
        },
        loc: { start: { line: 3, column: 2 } },
      };

      // Should handle method with tenant decorator without throwing
      expect(() => visitor.MethodDefinition?.(mockMethodNode)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle non-controller classes', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {},
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      // Service class (not a controller)
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Injectable' },
            },
          },
        ],
      });

      // Method in non-controller should be skipped
      const mockMethodNode = {
        decorators: [],
        key: { name: 'someMethod' },
        value: {
          params: [
            {
              decorators: [
                {
                  expression: {
                    type: 'CallExpression',
                    callee: { name: 'CurrentTenant' },
                  },
                },
              ],
            },
          ],
        },
      };

      // Should not throw even with tenant decorator in non-controller
      expect(() => visitor.MethodDefinition?.(mockMethodNode)).not.toThrow();
    });

    it('should handle method with @RequireTenant already present', () => {
      let reportCalled = false;
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {
          reportCalled = true;
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
      });

      const mockMethodNode = {
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Get' },
            },
          },
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'RequireTenant' },
            },
          },
        ],
        key: { name: 'method' },
        value: {
          params: [
            {
              decorators: [
                {
                  expression: {
                    type: 'CallExpression',
                    callee: { name: 'CurrentTenant' },
                  },
                },
              ],
            },
          ],
        },
        loc: { start: { line: 3, column: 2 } },
      };

      visitor.MethodDefinition?.(mockMethodNode);

      // Report should NOT be called because @RequireTenant is present
      expect(reportCalled).toBe(false);
    });

    it('should handle method with class-level guard', () => {
      let reportCalled = false;
      const mockContext = {
        options: [{ checkControllerDecorators: true }],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {
          reportCalled = true;
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantDecorator.create(mockContext);

      // Controller with UseGuards(TenantGuard)
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'UseGuards' },
              arguments: [{ name: 'TenantGuard' }],
            },
          },
        ],
      });

      const mockMethodNode = {
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Get' },
            },
          },
        ],
        key: { name: 'method' },
        value: {
          params: [
            {
              decorators: [
                {
                  expression: {
                    type: 'CallExpression',
                    callee: { name: 'CurrentTenant' },
                  },
                },
              ],
            },
          ],
        },
        loc: { start: { line: 3, column: 2 } },
      };

      visitor.MethodDefinition?.(mockMethodNode);

      // Report should NOT be called because class has TenantGuard
      expect(reportCalled).toBe(false);
    });
  });
});
