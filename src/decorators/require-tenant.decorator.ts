import { SetMetadata } from '@nestjs/common';
import { REQUIRE_TENANT_KEY } from '../guards/tenant.guard';

/**
 * Decorator to mark a controller or method as requiring a valid tenant context
 * Use with TenantGuard to enforce tenant requirements
 *
 * @example
 * ```typescript
 * @Controller('users')
 * @RequireTenant()
 * export class UsersController {
 *   // All methods require a tenant
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   @RequireTenant()
 *   findAll() {
 *     // Only this method requires a tenant
 *   }
 * }
 * ```
 */
export const RequireTenant = () => SetMetadata(REQUIRE_TENANT_KEY, true);
