import { describe, it, expect } from 'vitest';
import {
  MULTI_TENANT_OPTIONS,
  DEFAULT_TENANT_HEADER,
  DEFAULT_TENANT_QUERY_PARAM,
  DEFAULT_TENANT_PATH_INDEX,
  DEFAULT_TENANT_COOKIE,
  DEFAULT_JWT_TENANT_CLAIM,
} from './constants';

describe('Constants', () => {
  describe('MULTI_TENANT_OPTIONS', () => {
    it('should be defined', () => {
      expect(MULTI_TENANT_OPTIONS).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof MULTI_TENANT_OPTIONS).toBe('string');
    });

    it('should have expected value', () => {
      expect(MULTI_TENANT_OPTIONS).toBe('MULTI_TENANT_OPTIONS');
    });
  });

  describe('DEFAULT_TENANT_HEADER', () => {
    it('should be defined', () => {
      expect(DEFAULT_TENANT_HEADER).toBeDefined();
    });

    it('should be x-tenant-id', () => {
      expect(DEFAULT_TENANT_HEADER).toBe('x-tenant-id');
    });
  });

  describe('DEFAULT_TENANT_QUERY_PARAM', () => {
    it('should be defined', () => {
      expect(DEFAULT_TENANT_QUERY_PARAM).toBeDefined();
    });

    it('should be tenantId', () => {
      expect(DEFAULT_TENANT_QUERY_PARAM).toBe('tenantId');
    });
  });

  describe('DEFAULT_TENANT_PATH_INDEX', () => {
    it('should be defined', () => {
      expect(DEFAULT_TENANT_PATH_INDEX).toBeDefined();
    });

    it('should be 0', () => {
      expect(DEFAULT_TENANT_PATH_INDEX).toBe(0);
    });

    it('should be a number', () => {
      expect(typeof DEFAULT_TENANT_PATH_INDEX).toBe('number');
    });
  });

  describe('DEFAULT_TENANT_COOKIE', () => {
    it('should be defined', () => {
      expect(DEFAULT_TENANT_COOKIE).toBeDefined();
    });

    it('should be tenant_id', () => {
      expect(DEFAULT_TENANT_COOKIE).toBe('tenant_id');
    });

    it('should be a string', () => {
      expect(typeof DEFAULT_TENANT_COOKIE).toBe('string');
    });
  });

  describe('DEFAULT_JWT_TENANT_CLAIM', () => {
    it('should be defined', () => {
      expect(DEFAULT_JWT_TENANT_CLAIM).toBeDefined();
    });

    it('should be tenantId', () => {
      expect(DEFAULT_JWT_TENANT_CLAIM).toBe('tenantId');
    });

    it('should be a string', () => {
      expect(typeof DEFAULT_JWT_TENANT_CLAIM).toBe('string');
    });
  });
});
