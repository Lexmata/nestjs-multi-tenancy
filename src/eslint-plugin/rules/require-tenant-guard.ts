/**
 * ESLint rule: require-tenant-guard
 *
 * Warns when TenantContextService methods (getTenant, getTenantId, hasTenant)
 * are used in a class that doesn't have a TenantGuard or @RequireTenant() decorator.
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, unicorn/no-lonely-if */
// Note: ESTree types don't include TypeScript decorators, requiring dynamic property access

import type { Rule } from 'eslint';

interface RuleOptions {
  allowedWithoutGuard?: string[];
}

const TENANT_SERVICE_METHODS = new Set(['getTenant', 'getTenantId', 'hasTenant']);
const GUARD_DECORATORS = new Set(['UseGuards', 'RequireTenant']);
const TENANT_GUARD_NAME = 'TenantGuard';

function checkDecorators(decorators: any[] | undefined): boolean {
  if (!decorators) return false;

  return decorators.some((decorator) => {
    const expression = decorator?.expression;
    if (!expression) return false;

    // Check for @RequireTenant() or @UseGuards(TenantGuard)
    if (expression.type === 'CallExpression' && expression.callee?.type === 'Identifier') {
      if (GUARD_DECORATORS.has(expression.callee.name)) {
        if (expression.callee.name === 'UseGuards') {
          // Check if TenantGuard is in the arguments
          return expression.arguments?.some((arg: any) => {
            return arg?.type === 'Identifier' && arg?.name === TENANT_GUARD_NAME;
          });
        }
        return true;
      }
    }

    // Check for @RequireTenant without parentheses
    if (expression.type === 'Identifier' && GUARD_DECORATORS.has(expression.name)) {
      return true;
    }

    return false;
  });
}

export const requireTenantGuard: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require TenantGuard or @RequireTenant() when using TenantContextService methods',
      recommended: false,
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      missingGuard:
        'TenantContextService.{{method}}() is used without TenantGuard protection. ' +
        'Add @UseGuards(TenantGuard) or @RequireTenant() to ensure tenant context is validated.',
      suggestAddGuard: 'Add @UseGuards(TenantGuard) decorator to the class',
      suggestAddDecorator: 'Add @RequireTenant() decorator to this method',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedWithoutGuard: {
            type: 'array',
            items: { type: 'string' },
            description: 'Method names that are allowed to use tenant context without a guard',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = (context.options[0] as RuleOptions) || {};
    const allowedMethods = new Set(options.allowedWithoutGuard ?? []);

    // State tracking
    let tenantServiceImported = false;
    let classHasGuard = false;
    let classNode: any = null;
    let methodHasGuard = false;
    let methodNode: any = null;

    return {
      // Track TenantContextService import
      ImportDeclaration(node: any) {
        const source = node.source?.value;
        if (
          source === '@lexmata/nestjs-multi-tenant' ||
          (typeof source === 'string' && source.includes('tenant-context'))
        ) {
          for (const specifier of node.specifiers ?? []) {
            if (
              specifier.type === 'ImportSpecifier' &&
              specifier.imported?.type === 'Identifier' &&
              specifier.imported.name === 'TenantContextService'
            ) {
              tenantServiceImported = true;
            }
          }
        }
      },

      // Enter class
      ClassDeclaration(node: any) {
        classNode = node;
        classHasGuard = checkDecorators(node.decorators);
      },

      'ClassDeclaration:exit'() {
        classNode = null;
        classHasGuard = false;
      },

      // Enter method
      MethodDefinition(node: any) {
        methodNode = node;
        methodHasGuard = checkDecorators(node.decorators);
      },

      'MethodDefinition:exit'() {
        methodNode = null;
        methodHasGuard = false;
      },

      // Check for TenantContextService method calls
      CallExpression(node: any) {
        if (!tenantServiceImported) return;
        if (!classNode) return;

        const callee = node.callee;
        if (callee?.type !== 'MemberExpression') return;

        const property = callee.property;
        if (property?.type !== 'Identifier') return;
        if (!TENANT_SERVICE_METHODS.has(property.name)) return;

        // Check if object looks like TenantContextService
        const object = callee.object;
        let isServiceCall = false;

        if (object?.type === 'MemberExpression') {
          // this.tenantContextService.getTenant()
          const objProp = object.property;
          if (objProp?.type === 'Identifier') {
            const name = objProp.name.toLowerCase();
            if (name.includes('tenant') || name.includes('context')) {
              isServiceCall = true;
            }
          }
        } else if (object?.type === 'Identifier') {
          const name = object.name.toLowerCase();
          if (name.includes('tenant') || name.includes('context')) {
            isServiceCall = true;
          }
        }

        if (!isServiceCall) return;

        // Check if method is allowed
        if (methodNode) {
          const methodKey = methodNode.key;
          if (methodKey?.type === 'Identifier' && allowedMethods.has(methodKey.name)) {
            return;
          }
        }

        // Check if protected
        if (classHasGuard || methodHasGuard) {
          return;
        }

        // Report violation
        context.report({
          node,
          messageId: 'missingGuard',
          data: { method: property.name },
          suggest: [
            {
              messageId: 'suggestAddDecorator',
              fix(fixer) {
                if (!methodNode) return null;
                const sourceCode = context.sourceCode;
                const methodLine = methodNode.loc?.start?.line ?? 1;
                const lineText = sourceCode.lines[methodLine - 1] ?? '';
                const indentMatch = /^(\s*)/.exec(lineText);
                const indent = indentMatch?.[1] ?? '  ';
                const lineStart = sourceCode.getIndexFromLoc({ line: methodLine, column: 0 });
                return fixer.insertTextBeforeRange(
                  [lineStart, lineStart],
                  `${indent}@RequireTenant()\n`,
                );
              },
            },
          ],
        });
      },
    };
  },
};
