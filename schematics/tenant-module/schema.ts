export interface TenantModuleOptions {
  /**
   * The name of the module (e.g., 'users', 'projects')
   */
  name: string;

  /**
   * The path to create the module
   */
  path?: string;

  /**
   * Generate files without creating a folder
   */
  flat?: boolean;

  /**
   * Skip importing the module in the app module
   */
  skipImport?: boolean;

  /**
   * Skip generating test files
   */
  skipTests?: boolean;

  /**
   * Include a tenant-aware controller
   */
  includeController?: boolean;

  /**
   * Include a tenant-aware service
   */
  includeService?: boolean;

  /**
   * Generate CRUD operations in the controller
   */
  crud?: boolean;
}
