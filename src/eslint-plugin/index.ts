/**
 * ESLint plugin for @lexmata/nestjs-multi-tenant
 *
 * Provides rules to help ensure proper multi-tenant patterns:
 * - require-tenant-guard: Warns when TenantContextService is used without a guard
 * - require-tenant-decorator: Detects missing @RequireTenant() on controller methods
 *
 * @example
 * ```js
 * // eslint.config.js
 * import multiTenantPlugin from '@lexmata/nestjs-multi-tenant/eslint-plugin';
 *
 * export default [
 *   {
 *     plugins: {
 *       'multi-tenant': multiTenantPlugin,
 *     },
 *     rules: {
 *       'multi-tenant/require-tenant-guard': 'warn',
 *       'multi-tenant/require-tenant-decorator': 'warn',
 *     },
 *   },
 * ];
 * ```
 */

import type { ESLint } from 'eslint';
import { requireTenantGuard } from './rules/require-tenant-guard';
import { requireTenantDecorator } from './rules/require-tenant-decorator';

const plugin: ESLint.Plugin = {
  meta: {
    name: '@lexmata/nestjs-multi-tenant/eslint-plugin',
    version: '0.1.0',
  },
  rules: {
    'require-tenant-guard': requireTenantGuard,
    'require-tenant-decorator': requireTenantDecorator,
  },
  configs: {
    recommended: {
      plugins: ['@lexmata/multi-tenant'],
      rules: {
        '@lexmata/multi-tenant/require-tenant-guard': 'warn',
        '@lexmata/multi-tenant/require-tenant-decorator': 'warn',
      },
    },
    strict: {
      plugins: ['@lexmata/multi-tenant'],
      rules: {
        '@lexmata/multi-tenant/require-tenant-guard': 'error',
        '@lexmata/multi-tenant/require-tenant-decorator': 'error',
      },
    },
  },
};

export default plugin;
export { requireTenantGuard } from './rules/require-tenant-guard';
export { requireTenantDecorator } from './rules/require-tenant-decorator';
