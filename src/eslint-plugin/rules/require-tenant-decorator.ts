/**
 * ESLint rule: require-tenant-decorator
 *
 * Detects missing @RequireTenant() decorator on controller methods that
 * use tenant decorators (@CurrentTenant, @TenantId).
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, unicorn/no-lonely-if */
// Note: ESTree types don't include TypeScript decorators, requiring dynamic property access

import type { Rule } from 'eslint';

interface RuleOptions {
  exemptMethods?: string[];
  checkControllerDecorators?: boolean;
}

const TENANT_DECORATORS = new Set(['CurrentTenant', 'TenantId']);
const ROUTE_DECORATORS = new Set([
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'All',
  'Options',
  'Head',
]);
const TENANT_GUARD_NAME = 'TenantGuard';

function hasDecorator(decorators: any[] | undefined, names: Set<string>): boolean {
  if (!decorators) return false;

  return decorators.some((decorator) => {
    const expression = decorator?.expression;
    if (!expression) return false;

    if (expression.type === 'CallExpression' && expression.callee?.type === 'Identifier') {
      return names.has(expression.callee.name);
    }

    if (expression.type === 'Identifier') {
      return names.has(expression.name);
    }

    return false;
  });
}

function hasGuardDecorator(decorators: any[] | undefined): boolean {
  if (!decorators) return false;

  return decorators.some((decorator) => {
    const expression = decorator?.expression;
    if (!expression) return false;

    if (expression.type === 'CallExpression' && expression.callee?.type === 'Identifier') {
      if (expression.callee.name === 'RequireTenant') return true;
      if (expression.callee.name === 'UseGuards') {
        return expression.arguments?.some((arg: any) => {
          return arg?.type === 'Identifier' && arg?.name === TENANT_GUARD_NAME;
        });
      }
    }

    if (expression.type === 'Identifier' && expression.name === 'RequireTenant') {
      return true;
    }

    return false;
  });
}

function findTenantDecoratorInParams(node: any): string | null {
  const value = node?.value;
  if (value?.type !== 'FunctionExpression') return null;

  for (const param of value.params ?? []) {
    const decorators = param?.decorators;
    if (!decorators) continue;

    for (const decorator of decorators) {
      const expression = decorator?.expression;
      if (!expression) continue;

      if (expression.type === 'CallExpression' && expression.callee?.type === 'Identifier') {
        if (TENANT_DECORATORS.has(expression.callee.name)) {
          return expression.callee.name;
        }
      }

      if (expression.type === 'Identifier' && TENANT_DECORATORS.has(expression.name)) {
        return expression.name;
      }
    }
  }

  return null;
}

export const requireTenantDecorator: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require @RequireTenant() decorator on controller methods that use tenant decorators',
      recommended: false,
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      missingDecorator:
        'Method "{{methodName}}" uses @{{decorator}}() but is not protected. ' +
        'Add @RequireTenant() or @UseGuards(TenantGuard) to ensure tenant validation.',
      suggestAddDecorator: 'Add @RequireTenant() decorator to this method',
    },
    schema: [
      {
        type: 'object',
        properties: {
          exemptMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Method names that are exempt from this rule',
          },
          checkControllerDecorators: {
            type: 'boolean',
            description: 'Whether to check class-level decorators (default: true)',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = (context.options[0] as RuleOptions) ?? {};
    const exemptMethods = new Set(options.exemptMethods ?? []);
    const checkControllerDecorators = options.checkControllerDecorators !== false;

    let isController = false;
    let classHasGuard = false;

    return {
      // Track controller classes
      ClassDeclaration(node: any) {
        const decorators = node.decorators;
        isController = hasDecorator(decorators, new Set(['Controller']));
        classHasGuard = checkControllerDecorators && hasGuardDecorator(decorators);
      },

      'ClassDeclaration:exit'() {
        isController = false;
        classHasGuard = false;
      },

      // Check methods
      MethodDefinition(node: any) {
        if (!isController) return;

        const decorators = node.decorators;

        // Must be a route handler
        if (!hasDecorator(decorators, ROUTE_DECORATORS)) return;

        // Skip if class has guard
        if (classHasGuard) return;

        // Skip if method has guard
        if (hasGuardDecorator(decorators)) return;

        // Get method name
        const methodKey = node.key;
        if (methodKey?.type !== 'Identifier') return;
        const methodName = methodKey.name;

        // Skip exempt methods
        if (exemptMethods.has(methodName)) return;

        // Check for tenant decorators in parameters
        const tenantDecorator = findTenantDecoratorInParams(node);

        if (tenantDecorator) {
          const sourceCode = context.sourceCode;

          context.report({
            node,
            messageId: 'missingDecorator',
            data: { methodName, decorator: tenantDecorator },
            suggest: [
              {
                messageId: 'suggestAddDecorator',
                fix(fixer) {
                  const methodLine = node.loc?.start?.line ?? 1;
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
        }
      },
    };
  },
};
