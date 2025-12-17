import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CodeBlockComponent],
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

  // Prisma 7 Comprehensive Example
  prismaSchema = `// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      Plan     @default(FREE)
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  users     User[]
  projects  Project[]
  apiKeys   ApiKey[]
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

model User {
  id        String   @id @default(cuid())
  email     String
  name      String?
  role      Role     @default(MEMBER)
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Tenant-scoped unique constraint
  @@unique([tenantId, email])
  @@index([tenantId])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
}

model ApiKey {
  id        String   @id @default(cuid())
  key       String   @unique
  name      String
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  expiresAt DateTime?
  createdAt DateTime @default(now())

  @@index([tenantId])
}`;

  prismaExtension = `// src/prisma/prisma-tenant.extension.ts
import { Prisma } from '@prisma/client';

/**
 * Creates a Prisma client extension that automatically filters
 * all queries by tenantId for multi-tenant isolation.
 */
export function createTenantExtension(tenantId: string) {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'tenantExtension',

      query: {
        // User model
        user: {
          async findMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async findUnique({ args, query }) {
            // Add tenant check for unique queries
            const result = await query(args);
            if (result && result.tenantId !== tenantId) {
              return null; // Prevent cross-tenant access
            }
            return result;
          },
          async create({ args, query }) {
            args.data = { ...args.data, tenantId };
            return query(args);
          },
          async createMany({ args, query }) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d) => ({ ...d, tenantId }));
            } else {
              args.data = { ...args.data, tenantId };
            }
            return query(args);
          },
          async update({ args, query }) {
            args.where = { ...args.where, tenantId } as any;
            return query(args);
          },
          async updateMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async delete({ args, query }) {
            args.where = { ...args.where, tenantId } as any;
            return query(args);
          },
          async deleteMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async count({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async aggregate({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
        },

        // Project model - same pattern
        project: {
          async findMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async create({ args, query }) {
            args.data = { ...args.data, tenantId };
            return query(args);
          },
          async update({ args, query }) {
            args.where = { ...args.where, tenantId } as any;
            return query(args);
          },
          async delete({ args, query }) {
            args.where = { ...args.where, tenantId } as any;
            return query(args);
          },
          async deleteMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
        },

        // ApiKey model - same pattern
        apiKey: {
          async findMany({ args, query }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async create({ args, query }) {
            args.data = { ...args.data, tenantId };
            return query(args);
          },
          async delete({ args, query }) {
            args.where = { ...args.where, tenantId } as any;
            return query(args);
          },
        },
      },
    });
  });
}`;

  prismaTenantService = `// src/prisma/prisma-tenant.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { createTenantExtension } from './prisma-tenant.extension';

@Injectable()
export class PrismaTenantService implements OnModuleInit, OnModuleDestroy {
  private baseClient: PrismaClient;
  private clientCache = new Map<string, ReturnType<typeof this.createTenantClient>>();

  constructor(private readonly tenantContext: TenantContextService) {
    this.baseClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.baseClient.$connect();
  }

  async onModuleDestroy() {
    await this.baseClient.$disconnect();
  }

  /**
   * Get a tenant-scoped Prisma client.
   * All queries will automatically filter by the current tenant.
   */
  get client() {
    const tenantId = this.tenantContext.getTenantId();

    if (!tenantId) {
      throw new Error(
        'No tenant context available. Ensure you are within a tenant-scoped request.',
      );
    }

    // Cache extended clients per tenant for performance
    if (!this.clientCache.has(tenantId)) {
      this.clientCache.set(tenantId, this.createTenantClient(tenantId));
    }

    return this.clientCache.get(tenantId)!;
  }

  /**
   * Get the base Prisma client without tenant filtering.
   * Use for cross-tenant operations (admin, migrations, etc.)
   */
  get baseClientUnscoped() {
    return this.baseClient;
  }

  private createTenantClient(tenantId: string) {
    return this.baseClient.$extends(createTenantExtension(tenantId));
  }

  /**
   * Clear the client cache (useful for testing)
   */
  clearCache() {
    this.clientCache.clear();
  }
}`;

  prismaModule = `// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaTenantService } from './prisma-tenant.service';

@Global()
@Module({
  providers: [PrismaTenantService],
  exports: [PrismaTenantService],
})
export class PrismaModule {}`;

  prismaAppModule = `// src/app.module.ts
import { Module } from '@nestjs/common';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaTenantService } from './prisma/prisma-tenant.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Configure multi-tenant module with Prisma-based resolver
    MultiTenantModule.forRootAsync({
      imports: [PrismaModule],
      useFactory: (prisma: PrismaTenantService) => ({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        requireTenant: false,
        excludeRoutes: ['/health', '/api/auth/login', '/api/tenants'],

        // Resolve tenant from database
        tenantResolver: async (tenantId: string) => {
          const tenant = await prisma.baseClientUnscoped.tenant.findUnique({
            where: { id: tenantId },
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              settings: true,
            },
          });

          if (!tenant) return null;

          return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
            settings: tenant.settings as Record<string, unknown>,
          };
        },
      }),
      inject: [PrismaTenantService],
    }),

    PrismaModule,
    UsersModule,
  ],
})
export class AppModule {}`;

  prismaUsersService = `// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma/prisma-tenant.service';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaTenantService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Find all users for the current tenant.
   * The tenant filter is automatically applied by the Prisma extension.
   */
  async findAll(params?: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 20, search } = params ?? {};

    return this.prisma.client.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  /**
   * Find a single user by ID.
   * Returns null if user doesn't exist or belongs to different tenant.
   */
  async findOne(id: string) {
    const user = await this.prisma.client.user.findFirst({
      where: { id },
      include: {
        tenant: {
          select: { name: true, plan: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }

    return user;
  }

  /**
   * Create a new user for the current tenant.
   * tenantId is automatically injected by the Prisma extension.
   */
  async create(dto: CreateUserDto) {
    // Check for existing user with same email in this tenant
    const existing = await this.prisma.client.user.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    return this.prisma.client.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role ?? 'MEMBER',
        // tenantId is automatically added by extension!
      },
    });
  }

  /**
   * Update a user. Only updates if user belongs to current tenant.
   */
  async update(id: string, dto: UpdateUserDto) {
    // Verify user exists and belongs to tenant
    await this.findOne(id);

    return this.prisma.client.user.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a user. Only deletes if user belongs to current tenant.
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.client.user.delete({ where: { id } });
  }

  /**
   * Get user statistics for the current tenant
   */
  async getStats() {
    const [total, byRole] = await Promise.all([
      this.prisma.client.user.count(),
      this.prisma.client.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    return {
      tenantId: this.tenantContext.getTenantId(),
      total,
      byRole: byRole.reduce(
        (acc, { role, _count }) => ({ ...acc, [role]: _count }),
        {},
      ),
    };
  }
}`;

  prismaUsersController = `// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  CurrentTenant,
  TenantId,
  RequireTenant,
  TenantGuard,
  Tenant,
} from '@lexmata/nestjs-multi-tenant';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')
@UseGuards(TenantGuard)
@RequireTenant() // All endpoints require tenant context
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @CurrentTenant() tenant?: Tenant,
  ) {
    console.log(\`Fetching users for tenant: \${tenant?.name}\`);
    return this.usersService.findAll({ skip, take, search });
  }

  @Get('stats')
  async getStats(@TenantId() tenantId: string) {
    console.log(\`Getting stats for tenant: \${tenantId}\`);
    return this.usersService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}`;

  prismaTenantMiddleware = `// Alternative: Prisma Middleware Approach (simpler but less flexible)
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly tenantContext: TenantContextService) {
    super();

    // Add middleware for automatic tenant filtering
    this.$use(async (params, next) => {
      const tenantId = this.tenantContext.getTenantId();

      // Skip tenant filtering for certain models
      const skipModels = ['Tenant'];
      if (skipModels.includes(params.model ?? '')) {
        return next(params);
      }

      // Skip if no tenant context (public routes)
      if (!tenantId) {
        return next(params);
      }

      // Inject tenantId into queries
      if (params.action === 'findMany' || params.action === 'findFirst') {
        params.args.where = { ...params.args.where, tenantId };
      }

      if (params.action === 'create') {
        params.args.data = { ...params.args.data, tenantId };
      }

      if (params.action === 'update' || params.action === 'delete') {
        params.args.where = { ...params.args.where, tenantId };
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}`;

  activeTab = 'pnpm';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
