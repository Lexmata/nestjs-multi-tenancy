import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';

@Component({
  selector: 'app-knex',
  standalone: true,
  imports: [RouterLink, FaIconComponent, CodeBlockComponent],
  templateUrl: './knex.component.html',
  styleUrl: './knex.component.css',
})
export class KnexComponent {
  faArrowLeft = faArrowLeft;

  // Step 1: Knex configuration
  knexConfigCode = `// knexfile.ts
import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};

export default config;`;

  // Step 2: Migration
  migrationCode = `// migrations/001_create_tenants_and_users.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Tenants table
  await knex.schema.createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('slug').unique().notNullable();
    table.jsonb('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Users table with tenant_id
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('name');
    table.string('role').defaultTo('user');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Composite unique constraint
    table.unique(['tenant_id', 'email']);
    // Index for tenant queries
    table.index('tenant_id');
  });

  // Projects table with tenant_id
  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.string('status').defaultTo('active');
    table.timestamps(true, true);

    table.index('tenant_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('tenants');
}`;

  // Step 3: Tenant query builder
  queryBuilderCode = `// src/database/tenant-query-builder.ts
import { Knex } from 'knex';
import { Injectable, Scope } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable({ scope: Scope.REQUEST })
export class TenantQueryBuilder {
  private tenantId: string | null;

  constructor(
    private readonly knex: Knex,
    private readonly tenantContext: TenantContextService,
  ) {
    this.tenantId = this.tenantContext.getTenantId();
  }

  /**
   * Create a query builder for a tenant-aware table
   */
  table<TRecord extends object = any>(tableName: string): Knex.QueryBuilder<TRecord> {
    if (!this.tenantId) {
      throw new Error(\`Cannot query \${tableName} without tenant context\`);
    }

    return this.knex<TRecord>(tableName).where('tenant_id', this.tenantId);
  }

  /**
   * Create a raw query builder (no tenant filter)
   */
  raw<TRecord extends object = any>(tableName: string): Knex.QueryBuilder<TRecord> {
    return this.knex<TRecord>(tableName);
  }

  /**
   * Insert with automatic tenant_id
   */
  async insert<TRecord extends object>(
    tableName: string,
    data: Omit<TRecord, 'tenant_id'> | Omit<TRecord, 'tenant_id'>[],
  ): Promise<TRecord[]> {
    if (!this.tenantId) {
      throw new Error(\`Cannot insert into \${tableName} without tenant context\`);
    }

    const records = Array.isArray(data) ? data : [data];
    const withTenant = records.map((record) => ({
      ...record,
      tenant_id: this.tenantId,
    }));

    return this.knex<TRecord>(tableName).insert(withTenant as any).returning('*');
  }

  /**
   * Update with tenant filter
   */
  async update<TRecord extends object>(
    tableName: string,
    id: string,
    data: Partial<TRecord>,
  ): Promise<TRecord | undefined> {
    if (!this.tenantId) {
      throw new Error(\`Cannot update \${tableName} without tenant context\`);
    }

    // Prevent changing tenant_id
    const { tenant_id, ...updateData } = data as any;

    const [updated] = await this.knex<TRecord>(tableName)
      .where({ id, tenant_id: this.tenantId })
      .update(updateData as any)
      .returning('*');

    return updated;
  }

  /**
   * Delete with tenant filter
   */
  async delete(tableName: string, id: string): Promise<boolean> {
    if (!this.tenantId) {
      throw new Error(\`Cannot delete from \${tableName} without tenant context\`);
    }

    const deleted = await this.knex(tableName)
      .where({ id, tenant_id: this.tenantId })
      .del();

    return deleted > 0;
  }

  /**
   * Transaction with tenant context
   */
  async transaction<T>(
    callback: (trx: TenantQueryBuilder) => Promise<T>,
  ): Promise<T> {
    return this.knex.transaction(async (trx) => {
      const tenantTrx = new TenantQueryBuilder(trx, this.tenantContext);
      return callback(tenantTrx);
    });
  }

  /**
   * Get tenant ID for raw queries
   */
  getTenantId(): string {
    if (!this.tenantId) {
      throw new Error('No tenant in context');
    }
    return this.tenantId;
  }
}`;

  // Step 4: Database module
  moduleCode = `// src/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import knex, { Knex } from 'knex';
import { MultiTenantModule, TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { TenantQueryBuilder } from './tenant-query-builder';
import knexConfig from '../../knexfile';

export const KNEX_CONNECTION = 'KNEX_CONNECTION';

@Global()
@Module({
  imports: [MultiTenantModule],
  providers: [
    {
      provide: KNEX_CONNECTION,
      useFactory: async (): Promise<Knex> => {
        const connection = knex(knexConfig.development);
        // Test connection
        await connection.raw('SELECT 1');
        return connection;
      },
    },
    {
      provide: TenantQueryBuilder,
      useFactory: (knexConn: Knex, tenantContext: TenantContextService) => {
        return new TenantQueryBuilder(knexConn, tenantContext);
      },
      inject: [KNEX_CONNECTION, TenantContextService],
      scope: Scope.REQUEST,
    },
  ],
  exports: [KNEX_CONNECTION, TenantQueryBuilder],
})
export class DatabaseModule {}`;

  // Step 5: Service
  serviceCode = `// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { TenantQueryBuilder } from '../database/tenant-query-builder';

interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly db: TenantQueryBuilder) {}

  async findAll(): Promise<User[]> {
    return this.db.table<User>('users').select('*');
  }

  async findOne(id: string): Promise<User | undefined> {
    return this.db.table<User>('users').where('id', id).first();
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.db.table<User>('users').where('email', email).first();
  }

  async create(data: { email: string; name?: string; role?: string }): Promise<User> {
    const [user] = await this.db.insert<User>('users', data);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | undefined> {
    return this.db.update<User>('users', id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete('users', id);
  }

  // Complex queries with tenant filtering
  async findActiveByRole(role: string): Promise<User[]> {
    return this.db
      .table<User>('users')
      .where('role', role)
      .where('is_active', true)
      .orderBy('created_at', 'desc');
  }

  // Aggregations
  async countByRole(): Promise<{ role: string; count: number }[]> {
    return this.db
      .table<User>('users')
      .select('role')
      .count('* as count')
      .groupBy('role');
  }

  // Raw query when needed
  async searchUsers(query: string): Promise<User[]> {
    const tenantId = this.db.getTenantId();

    return this.db
      .raw<User>('users')
      .where('tenant_id', tenantId)
      .where((builder) => {
        builder
          .whereILike('name', \`%\${query}%\`)
          .orWhereILike('email', \`%\${query}%\`);
      });
  }
}`;

  // Step 6: Per-tenant migrations
  perTenantMigrationCode = `// src/database/tenant-migration.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from './database.module';

@Injectable()
export class TenantMigrationService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /**
   * Create schema for a new tenant (PostgreSQL)
   */
  async createTenantSchema(tenantId: string): Promise<void> {
    const schemaName = \`tenant_\${tenantId.replace(/-/g, '_')}\`;

    // Create schema
    await this.knex.raw(\`CREATE SCHEMA IF NOT EXISTS "\${schemaName}"\`);

    // Run tenant-specific migrations
    await this.runTenantMigrations(schemaName);
  }

  /**
   * Run migrations in a specific schema
   */
  private async runTenantMigrations(schemaName: string): Promise<void> {
    // Set search path to tenant schema
    await this.knex.raw(\`SET search_path TO "\${schemaName}"\`);

    // Create tenant-specific tables
    await this.createTenantTables();

    // Reset search path
    await this.knex.raw('SET search_path TO public');
  }

  private async createTenantTables(): Promise<void> {
    // Users table (no tenant_id needed - schema provides isolation)
    if (!(await this.knex.schema.hasTable('users'))) {
      await this.knex.schema.createTable('users', (table) => {
        table.uuid('id').primary().defaultTo(this.knex.raw('gen_random_uuid()'));
        table.string('email').unique().notNullable();
        table.string('name');
        table.string('role').defaultTo('user');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
    }

    // Projects table
    if (!(await this.knex.schema.hasTable('projects'))) {
      await this.knex.schema.createTable('projects', (table) => {
        table.uuid('id').primary().defaultTo(this.knex.raw('gen_random_uuid()'));
        table.string('name').notNullable();
        table.text('description');
        table.string('status').defaultTo('active');
        table.timestamps(true, true);
      });
    }
  }

  /**
   * Drop tenant schema (for cleanup)
   */
  async dropTenantSchema(tenantId: string): Promise<void> {
    const schemaName = \`tenant_\${tenantId.replace(/-/g, '_')}\`;
    await this.knex.raw(\`DROP SCHEMA IF EXISTS "\${schemaName}" CASCADE\`);
  }

  /**
   * List all tenant schemas
   */
  async listTenantSchemas(): Promise<string[]> {
    const result = await this.knex.raw(\`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
    \`);

    return result.rows.map((row: any) => row.schema_name);
  }
}`;

  // Step 7: Controller
  controllerCode = `// src/users/users.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TenantGuard, RequireTenant, CurrentTenant, TenantId, Tenant } from '@lexmata/nestjs-multi-tenant';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequireTenant()
  findAll() {
    // TenantQueryBuilder automatically filters by tenant
    return this.usersService.findAll();
  }

  @Get('search')
  @RequireTenant()
  search(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get(':id')
  @RequireTenant()
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequireTenant()
  create(@Body() data: { email: string; name?: string }) {
    // tenant_id automatically added by TenantQueryBuilder
    return this.usersService.create(data);
  }

  @Put(':id')
  @RequireTenant()
  update(@Param('id') id: string, @Body() data: any) {
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  @RequireTenant()
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}`;
}
