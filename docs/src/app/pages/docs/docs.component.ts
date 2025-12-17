import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CodeBlockComponent, RouterLink],
  templateUrl: './docs.component.html',
})
export class DocsComponent {
  // Installation code examples
  installPnpm = 'pnpm add @lexmata/nestjs-multi-tenant';
  installNpm = 'npm install @lexmata/nestjs-multi-tenant';
  installYarn = 'yarn add @lexmata/nestjs-multi-tenant';

  peerDeps = `{
  "@nestjs/common": "^10.0.0 || ^11.0.0",
  "@nestjs/core": "^10.0.0 || ^11.0.0",
  "reflect-metadata": "^0.1.13 || ^0.2.0",
  "rxjs": "^7.0.0"
}`;

  // Quick Start examples
  quickStart1 = `import { Module } from '@nestjs/common';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';

@Module({
  imports: [
    MultiTenantModule.forRoot({
      extractionStrategy: 'header',
      tenantHeader: 'x-tenant-id',
    }),
  ],
})
export class AppModule {}`;

  quickStart2 = `import { Controller, Get } from '@nestjs/common';
import { CurrentTenant, TenantId, Tenant } from '@lexmata/nestjs-multi-tenant';

@Controller('users')
export class UsersController {
  @Get()
  findAll(@CurrentTenant() tenant: Tenant) {
    console.log(\`Fetching users for tenant: \${tenant.id}\`);
    return this.usersService.findAll(tenant.id);
  }

  @Get('profile')
  getProfile(@TenantId() tenantId: string) {
    return this.usersService.getProfile(tenantId);
  }
}`;

  quickStart3 = `import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable()
export class UsersService {
  constructor(private readonly tenantContext: TenantContextService) {}

  findAll() {
    const tenantId = this.tenantContext.getTenantId();
    // Use tenantId for database queries, etc.
  }
}`;

  // Configuration examples
  basicConfig = `MultiTenantModule.forRoot({
  // Extraction strategy (default: 'header')
  extractionStrategy: 'header' | 'subdomain' | 'path' | 'query' | 'custom',

  // Header name for 'header' strategy (default: 'x-tenant-id')
  tenantHeader: 'x-tenant-id',

  // Query param for 'query' strategy (default: 'tenantId')
  tenantQueryParam: 'tenantId',

  // Path segment index for 'path' strategy (default: 0)
  tenantPathIndex: 0,

  // Custom extractor function for 'custom' strategy
  customExtractor: (request) => request.headers['x-custom-header'],

  // Resolve full tenant data from ID
  tenantResolver: async (tenantId) => {
    return { id: tenantId, name: 'Tenant Name', plan: 'premium' };
  },

  // Throw error if tenant cannot be determined (default: false)
  requireTenant: false,

  // Routes to exclude from tenant extraction
  excludeRoutes: ['/health', '/api/public', /^\\/docs/],
})`;

  asyncConfig = `import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MultiTenantModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        extractionStrategy: config.get('TENANT_STRATEGY'),
        tenantHeader: config.get('TENANT_HEADER'),
        requireTenant: config.get('REQUIRE_TENANT'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}`;

  // Strategy examples
  headerStrategy = `MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  tenantHeader: 'x-tenant-id', // default
})`;

  headerCurl = 'curl -H "x-tenant-id: tenant-123" http://localhost:3000/api/users';

  subdomainStrategy = `MultiTenantModule.forRoot({
  extractionStrategy: 'subdomain',
})`;

  pathStrategy = `MultiTenantModule.forRoot({
  extractionStrategy: 'path',
  tenantPathIndex: 0, // First path segment after /
})`;

  queryStrategy = `MultiTenantModule.forRoot({
  extractionStrategy: 'query',
  tenantQueryParam: 'tenantId', // default
})`;

  customStrategy = `MultiTenantModule.forRoot({
  extractionStrategy: 'custom',
  customExtractor: async (request) => {
    // Extract from JWT token
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.decode(token);
      return decoded?.tenantId || null;
    }
    return null;
  },
})`;

  // Decorators examples
  currentTenantDecorator = `@Get()
findAll(@CurrentTenant() tenant: Tenant) {
  // tenant: { id: 'tenant-123', name: 'Acme Corp', ... }
}`;

  tenantIdDecorator = `@Get()
findAll(@TenantId() tenantId: string) {
  // tenantId: 'tenant-123'
}`;

  requireTenantDecorator = `import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireTenant, TenantGuard } from '@lexmata/nestjs-multi-tenant';

@Controller('users')
@UseGuards(TenantGuard)
@RequireTenant()
export class UsersController {
  @Get()
  findAll() {
    // Guaranteed to have tenant context
  }
}`;

  // Guards example
  guardsExample = `@Controller('mixed')
@UseGuards(TenantGuard)
export class MixedController {
  @Get('public')
  publicEndpoint() {
    // No tenant required
  }

  @Get('private')
  @RequireTenant()
  privateEndpoint() {
    // Tenant required - will throw 403 if no tenant
  }
}`;

  // Context Service example
  contextService = `import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable()
export class AnyService {
  constructor(private readonly tenantContext: TenantContextService) {}

  doSomething() {
    // Get full tenant object
    const tenant = this.tenantContext.getTenant();

    // Get just the ID
    const tenantId = this.tenantContext.getTenantId();

    // Check if in tenant context
    if (this.tenantContext.hasTenant()) {
      // In tenant context
    }
  }
}`;

  contextRun = `const tenant = { id: 'tenant-123', name: 'Test' };

tenantContext.run(tenant, () => {
  // All code here has access to the tenant context
  const id = tenantContext.getTenantId(); // 'tenant-123'
});`;

  // Tenant Resolver example
  tenantResolver = `MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  tenantResolver: async (tenantId: string) => {
    // Fetch from database
    const tenant = await this.tenantsRepository.findOne(tenantId);
    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.subscriptionPlan,
      settings: tenant.settings,
    };
  },
})`;

  // Route Exclusions example
  routeExclusions = `MultiTenantModule.forRoot({
  extractionStrategy: 'header',
  requireTenant: true,
  excludeRoutes: [
    '/health',              // Exact match
    '/api/public',          // Prefix match
    /^\\/docs/,              // Regex match
    /^\\/api\\/v\\d+\\/public/, // Complex regex
  ],
})`;

  // Example: Database
  exampleDatabase = `import { Injectable, Scope } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable({ scope: Scope.REQUEST })
export class TenantDatabaseService {
  constructor(private readonly tenantContext: TenantContextService) {}

  getConnection() {
    const tenantId = this.tenantContext.getTenantId();
    // Return tenant-specific database connection
    return this.connectionPool.get(tenantId);
  }
}`;

  // Example: Repository
  exampleRepository = `import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.user.findMany({
      where: { tenantId },
    });
  }

  create(data: CreateUserDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.user.create({
      data: { ...data, tenantId },
    });
  }
}`;

  // Example: JWT
  exampleJwt = `import { JwtService } from '@nestjs/jwt';

MultiTenantModule.forRootAsync({
  imports: [JwtModule],
  useFactory: (jwt: JwtService) => ({
    extractionStrategy: 'custom',
    customExtractor: (request) => {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return null;

      try {
        const payload = jwt.verify(token);
        return payload.tenantId;
      } catch {
        return null;
      }
    },
  }),
  inject: [JwtService],
})`;

  activeTab = 'pnpm';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
