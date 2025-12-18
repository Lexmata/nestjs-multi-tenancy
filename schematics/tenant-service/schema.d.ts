export interface TenantServiceOptions {
  /**
   * The name of the service (e.g., 'users', 'projects')
   */
  name: string;
  /**
   * The path to create the service
   */
  path?: string;
  /**
   * Generate file without creating a folder
   */
  flat?: boolean;
  /**
   * Skip generating test file
   */
  skipTests?: boolean;
}
