import { describe, expect, it } from 'vitest';
import plugin, { requireTenantGuard, requireTenantDecorator } from './index';

describe('eslint-plugin', () => {
  it('should export plugin as default', () => {
    expect(plugin).toBeDefined();
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@lexmata/nestjs-multi-tenant/eslint-plugin');
    expect(plugin.meta?.version).toBe('0.1.0');
  });

  it('should export rules', () => {
    expect(plugin.rules).toBeDefined();
    expect(plugin.rules).toHaveProperty('require-tenant-guard');
    expect(plugin.rules).toHaveProperty('require-tenant-decorator');
  });

  it('should export recommended config', () => {
    expect(plugin.configs).toBeDefined();
    expect(plugin.configs?.recommended).toBeDefined();
    expect(plugin.configs?.recommended.plugins).toContain('@lexmata/multi-tenant');
    expect(plugin.configs?.recommended.rules).toHaveProperty(
      '@lexmata/multi-tenant/require-tenant-guard',
      'warn',
    );
    expect(plugin.configs?.recommended.rules).toHaveProperty(
      '@lexmata/multi-tenant/require-tenant-decorator',
      'warn',
    );
  });

  it('should export strict config', () => {
    expect(plugin.configs?.strict).toBeDefined();
    expect(plugin.configs?.strict.plugins).toContain('@lexmata/multi-tenant');
    expect(plugin.configs?.strict.rules).toHaveProperty(
      '@lexmata/multi-tenant/require-tenant-guard',
      'error',
    );
    expect(plugin.configs?.strict.rules).toHaveProperty(
      '@lexmata/multi-tenant/require-tenant-decorator',
      'error',
    );
  });

  it('should export named rules', () => {
    expect(requireTenantGuard).toBeDefined();
    expect(requireTenantDecorator).toBeDefined();
  });

  it('should have rules matching named exports', () => {
    expect(plugin.rules?.['require-tenant-guard']).toBe(requireTenantGuard);
    expect(plugin.rules?.['require-tenant-decorator']).toBe(requireTenantDecorator);
  });
});
