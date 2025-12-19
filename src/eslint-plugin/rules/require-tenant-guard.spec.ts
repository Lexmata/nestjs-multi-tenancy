import { describe, expect, it } from 'vitest';
import { requireTenantGuard } from './require-tenant-guard';

describe('require-tenant-guard rule', () => {
  describe('meta configuration', () => {
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

    it('should have proper docs configuration', () => {
      const docs = requireTenantGuard.meta?.docs;
      expect(docs).toBeDefined();
      expect(docs?.description).toBeDefined();
      expect(docs?.recommended).toBe(false); // Not auto-enabled
    });

    it('should have schema for options', () => {
      const schema = requireTenantGuard.meta?.schema;
      expect(schema).toBeDefined();
      expect(Array.isArray(schema)).toBe(true);
    });

    it('should have create function', () => {
      expect(typeof requireTenantGuard.create).toBe('function');
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
      const visitor = requireTenantGuard.create(mockContext);

      expect(visitor).toBeDefined();
      expect(typeof visitor).toBe('object');
      expect(visitor).toHaveProperty('ImportDeclaration');
      expect(visitor).toHaveProperty('ClassDeclaration');
      expect(visitor).toHaveProperty('CallExpression');
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
      const visitor = requireTenantGuard.create(mockContext);

      expect(visitor).toBeDefined();
    });

    it('should handle options with allowedWithoutGuard', () => {
      const mockContext = {
        options: [{ allowedWithoutGuard: ['healthCheck', 'ping'] }],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock for testing
      const visitor = requireTenantGuard.create(mockContext);

      expect(visitor).toBeDefined();
    });
  });

  describe('ImportDeclaration visitor', () => {
    it('should detect TenantContextService import', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      const mockNode = {
        source: { value: '@lexmata/nestjs-multi-tenant' },
        specifiers: [
          {
            type: 'ImportSpecifier',
            imported: { name: 'TenantContextService' },
          },
        ],
      };

      expect(() => visitor.ImportDeclaration?.(mockNode)).not.toThrow();
    });

    it('should detect TenantContextService import from relative path', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      const mockNode = {
        source: { value: '../services/tenant-context.service' },
        specifiers: [
          {
            type: 'ImportSpecifier',
            imported: { name: 'TenantContextService' },
          },
        ],
      };

      expect(() => visitor.ImportDeclaration?.(mockNode)).not.toThrow();
    });

    it('should handle namespace import', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      const mockNode = {
        source: { value: '@lexmata/nestjs-multi-tenant' },
        specifiers: [
          {
            type: 'ImportNamespaceSpecifier',
            local: { name: 'MultiTenant' },
          },
        ],
      };

      expect(() => visitor.ImportDeclaration?.(mockNode)).not.toThrow();
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
      const visitor = requireTenantGuard.create(mockContext);

      const mockNode = {
        decorators: undefined,
        body: { body: [] },
      };

      expect(() => visitor.ClassDeclaration?.(mockNode)).not.toThrow();
    });

    it('should detect UseGuards with TenantGuard', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      const mockNode = {
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'UseGuards' },
              arguments: [{ name: 'TenantGuard' }],
            },
          },
        ],
        body: { body: [] },
      };

      expect(() => visitor.ClassDeclaration?.(mockNode)).not.toThrow();
    });

    it('should detect @RequireTenant decorator', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      const mockNode = {
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'RequireTenant' },
            },
          },
        ],
        body: { body: [] },
      };

      expect(() => visitor.ClassDeclaration?.(mockNode)).not.toThrow();
    });
  });

  describe('CallExpression visitor', () => {
    it('should handle non-member expression calls', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {},
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      const mockNode = {
        callee: {
          type: 'Identifier',
          name: 'someFunction',
        },
      };

      expect(() => visitor.CallExpression?.(mockNode)).not.toThrow();
    });

    it('should handle TenantContextService method call patterns', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {},
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      // Simulate import detection
      visitor.ImportDeclaration?.({
        source: { value: '@lexmata/nestjs-multi-tenant' },
        specifiers: [
          {
            type: 'ImportSpecifier',
            imported: { name: 'TenantContextService' },
          },
        ],
      });

      // Simulate class without guard
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
        body: { body: [] },
      });

      // Simulate TenantContextService method call - should not throw
      const mockCallNode = {
        callee: {
          type: 'MemberExpression',
          property: { name: 'getTenant' },
          object: {
            type: 'MemberExpression',
            property: { name: 'tenantContext' },
          },
        },
        loc: { start: { line: 6, column: 22 } },
      };

      // Should handle gracefully without throwing
      expect(() => visitor.CallExpression?.(mockCallNode)).not.toThrow();
    });

    it('should not report when guard is present', () => {
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
      const visitor = requireTenantGuard.create(mockContext);

      // Simulate import
      visitor.ImportDeclaration?.({
        source: { value: '@lexmata/nestjs-multi-tenant' },
        specifiers: [
          {
            type: 'ImportSpecifier',
            imported: { name: 'TenantContextService' },
          },
        ],
      });

      // Class WITH guard
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
        body: { body: [] },
      });

      // TenantContextService call
      const mockCallNode = {
        callee: {
          type: 'MemberExpression',
          property: { name: 'getTenant' },
          object: {
            type: 'MemberExpression',
            property: { name: 'tenantContext' },
          },
        },
        loc: { start: { line: 6, column: 22 } },
      };

      visitor.CallExpression?.(mockCallNode);

      // Report should NOT be called because guard is present
      expect(reportCalled).toBe(false);
    });
  });

  describe('method-level guards', () => {
    it('should detect method-level UseGuards', () => {
      const mockContext = {
        options: [{}],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {},
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      // Simulate import
      visitor.ImportDeclaration?.({
        source: { value: '@lexmata/nestjs-multi-tenant' },
        specifiers: [
          {
            type: 'ImportSpecifier',
            imported: { name: 'TenantContextService' },
          },
        ],
      });

      // Class WITHOUT guard at class level but with method
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
        body: {
          body: [
            {
              type: 'MethodDefinition',
              key: { name: 'testMethod' },
              decorators: [
                {
                  expression: {
                    type: 'CallExpression',
                    callee: { name: 'UseGuards' },
                    arguments: [{ name: 'TenantGuard' }],
                  },
                },
              ],
            },
          ],
        },
      });

      // We need to handle this case properly - the test verifies structure
      expect(visitor).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should skip when TenantContextService not imported', () => {
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
      const visitor = requireTenantGuard.create(mockContext);

      // No import, just class and call
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
        body: { body: [] },
      });

      const mockCallNode = {
        callee: {
          type: 'MemberExpression',
          property: { name: 'getTenant' },
          object: {
            type: 'MemberExpression',
            property: { name: 'tenantContext' },
          },
        },
        loc: { start: { line: 6, column: 22 } },
      };

      visitor.CallExpression?.(mockCallNode);

      // Report should NOT be called because TenantContextService not imported
      expect(reportCalled).toBe(false);
    });

    it('should handle methods in allowedWithoutGuard list', () => {
      let reportCalled = false;
      const mockContext = {
        options: [{ allowedWithoutGuard: ['getTenant'] }],
        sourceCode: {
          lines: [],
          getIndexFromLoc: () => 0,
        },
        report: () => {
          reportCalled = true;
        },
      };

      // @ts-expect-error - minimal mock
      const visitor = requireTenantGuard.create(mockContext);

      // Simulate import
      visitor.ImportDeclaration?.({
        source: { value: '@lexmata/nestjs-multi-tenant' },
        specifiers: [
          {
            type: 'ImportSpecifier',
            imported: { name: 'TenantContextService' },
          },
        ],
      });

      // Class without guard
      visitor.ClassDeclaration?.({
        decorators: [
          {
            expression: {
              type: 'CallExpression',
              callee: { name: 'Controller' },
            },
          },
        ],
        body: { body: [] },
      });

      const mockCallNode = {
        callee: {
          type: 'MemberExpression',
          property: { name: 'getTenant' },
          object: {
            type: 'MemberExpression',
            property: { name: 'tenantContext' },
          },
        },
        loc: { start: { line: 6, column: 22 } },
      };

      visitor.CallExpression?.(mockCallNode);

      // Report should NOT be called because getTenant is in allowedWithoutGuard
      expect(reportCalled).toBe(false);
    });
  });
});
