import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';

@Component({
  selector: 'app-drizzle',
  standalone: true,
  imports: [CodeBlockComponent, RouterLink],
  templateUrl: './drizzle.component.html',
})
export class DrizzleComponent {
  // Schema
  schema = `// src/database/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const planEnum = pgEnum('plan', ['FREE', 'PRO', 'ENTERPRISE']);
export const roleEnum = pgEnum('role', ['OWNER', 'ADMIN', 'MEMBER']);

// Tenants table
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  plan: planEnum('plan').default('FREE').notNull(),
  settings: jsonb('settings').default({}).$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    role: roleEnum('role').default('MEMBER').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Tenant-scoped unique email
    tenantEmailUnique: uniqueIndex('users_tenant_email_unique').on(
      table.tenantId,
      table.email,
    ),
    // Index for fast tenant queries
    tenantIdIdx: index('users_tenant_id_idx').on(table.tenantId),
  }),
);

// Projects table
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('projects_tenant_id_idx').on(table.tenantId),
  }),
);

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
}));

// Type exports
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;`;

  // Drizzle service
  drizzleService = `// src/database/drizzle.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit {
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.pool = new Pool({
      host: this.config.get('DB_HOST'),
      port: this.config.get('DB_PORT'),
      user: this.config.get('DB_USER'),
      password: this.config.get('DB_PASSWORD'),
      database: this.config.get('DB_NAME'),
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}`;

  // Tenant Drizzle service
  tenantDrizzleService = `// src/database/tenant-drizzle.service.ts
import { Injectable } from '@nestjs/common';
import { eq, and, SQL, ilike, or, count, sql } from 'drizzle-orm';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { DrizzleService } from './drizzle.service';
import * as schema from './schema';

/**
 * Tenant-aware Drizzle service that provides scoped query methods.
 */
@Injectable()
export class TenantDrizzleService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
  ) {}

  get db() {
    return this.drizzle.db;
  }

  get tenantId(): string {
    const id = this.tenantContext.getTenantId();
    if (!id) {
      throw new Error('No tenant context available');
    }
    return id;
  }

  /**
   * Add tenant filter to any condition
   */
  withTenant<T extends { tenantId: any }>(
    table: T,
    condition?: SQL,
  ): SQL {
    const tenantCondition = eq(table.tenantId, this.tenantId);
    return condition ? and(tenantCondition, condition)! : tenantCondition;
  }

  // ============ Users ============

  async findAllUsers(params?: { search?: string; limit?: number; offset?: number }) {
    const { search, limit = 20, offset = 0 } = params ?? {};

    let query = this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.tenantId, this.tenantId))
      .limit(limit)
      .offset(offset)
      .orderBy(schema.users.createdAt);

    if (search) {
      query = this.db
        .select()
        .from(schema.users)
        .where(
          and(
            eq(schema.users.tenantId, this.tenantId),
            or(
              ilike(schema.users.name, \`%\${search}%\`),
              ilike(schema.users.email, \`%\${search}%\`),
            ),
          ),
        )
        .limit(limit)
        .offset(offset);
    }

    return query;
  }

  async findUserById(id: string) {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, id),
          eq(schema.users.tenantId, this.tenantId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findUserByEmail(email: string) {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.email, email),
          eq(schema.users.tenantId, this.tenantId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async createUser(data: Omit<schema.NewUser, 'tenantId'>) {
    const result = await this.db
      .insert(schema.users)
      .values({
        ...data,
        tenantId: this.tenantId, // Auto-inject tenant
      })
      .returning();

    return result[0];
  }

  async updateUser(id: string, data: Partial<Omit<schema.NewUser, 'tenantId' | 'id'>>) {
    const result = await this.db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(schema.users.id, id),
          eq(schema.users.tenantId, this.tenantId),
        ),
      )
      .returning();

    return result[0] ?? null;
  }

  async deleteUser(id: string) {
    const result = await this.db
      .delete(schema.users)
      .where(
        and(
          eq(schema.users.id, id),
          eq(schema.users.tenantId, this.tenantId),
        ),
      )
      .returning();

    return result.length > 0;
  }

  async countUsers() {
    const result = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(eq(schema.users.tenantId, this.tenantId));

    return result[0]?.count ?? 0;
  }

  async getUserStats() {
    const [totalResult, byRoleResult] = await Promise.all([
      this.countUsers(),
      this.db
        .select({
          role: schema.users.role,
          count: count(),
        })
        .from(schema.users)
        .where(eq(schema.users.tenantId, this.tenantId))
        .groupBy(schema.users.role),
    ]);

    return {
      total: totalResult,
      byRole: byRoleResult.reduce(
        (acc, { role, count }) => ({ ...acc, [role]: count }),
        {} as Record<string, number>,
      ),
    };
  }

  // ============ Projects ============

  async findAllProjects(limit = 20, offset = 0) {
    return this.db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.tenantId, this.tenantId))
      .limit(limit)
      .offset(offset)
      .orderBy(schema.projects.createdAt);
  }

  async createProject(data: Omit<schema.NewProject, 'tenantId'>) {
    const result = await this.db
      .insert(schema.projects)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning();

    return result[0];
  }
}`;

  // Users service
  usersService = `// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { TenantDrizzleService } from '../database/tenant-drizzle.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: TenantDrizzleService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(params?: { search?: string; limit?: number; offset?: number }) {
    return this.db.findAllUsers(params);
  }

  async findOne(id: string) {
    const user = await this.db.findUserById(id);
    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    // Check for existing user
    const existing = await this.db.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    return this.db.createUser({
      email: dto.email,
      name: dto.name,
      role: dto.role ?? 'MEMBER',
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.db.updateUser(id, dto);
    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return user;
  }

  async remove(id: string) {
    const deleted = await this.db.deleteUser(id);
    if (!deleted) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return { success: true };
  }

  async getStats() {
    return {
      tenantId: this.tenantContext.getTenantId(),
      ...(await this.db.getUserStats()),
    };
  }
}`;

  // App module
  appModule = `// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { eq } from 'drizzle-orm';
import { DrizzleService } from './database/drizzle.service';
import { TenantDrizzleService } from './database/tenant-drizzle.service';
import { tenants } from './database/schema';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MultiTenantModule.forRootAsync({
      useFactory: (drizzle: DrizzleService) => ({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        requireTenant: false,
        excludeRoutes: ['/health', '/api/auth/login'],

        tenantResolver: async (tenantId: string) => {
          const result = await drizzle.db
            .select({
              id: tenants.id,
              name: tenants.name,
              slug: tenants.slug,
              plan: tenants.plan,
              settings: tenants.settings,
            })
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .limit(1);

          return result[0] ?? null;
        },
      }),
      inject: [DrizzleService],
      extraProviders: [DrizzleService],
    }),

    UsersModule,
  ],
  providers: [DrizzleService, TenantDrizzleService],
  exports: [DrizzleService, TenantDrizzleService],
})
export class AppModule {}`;

  // Transaction example
  transaction = `// Using transactions with tenant scope
async transferUserToProject(userId: string, projectId: string) {
  return this.db.db.transaction(async (tx) => {
    // All queries in transaction are tenant-scoped
    const user = await tx
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, userId),
          eq(schema.users.tenantId, this.tenantId),
        ),
      )
      .limit(1);

    if (!user[0]) {
      throw new Error('User not found');
    }

    const project = await tx
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.tenantId, this.tenantId),
        ),
      )
      .limit(1);

    if (!project[0]) {
      throw new Error('Project not found');
    }

    // Perform updates within transaction
    await tx
      .update(schema.users)
      .set({ /* ... */ })
      .where(eq(schema.users.id, userId));

    return { user: user[0], project: project[0] };
  });
}`;

  // Prepared statements
  preparedStatements = `// Using prepared statements for performance
import { sql } from 'drizzle-orm';

// Prepared query for finding users by tenant
const findUsersByTenantQuery = this.db.db
  .select()
  .from(schema.users)
  .where(eq(schema.users.tenantId, sql.placeholder('tenantId')))
  .prepare('find_users_by_tenant');

// Execute prepared query
const users = await findUsersByTenantQuery.execute({
  tenantId: this.tenantId,
});`;
}
