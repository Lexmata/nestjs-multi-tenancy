import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';

@Component({
  selector: 'app-mikro-orm',
  standalone: true,
  imports: [CodeBlockComponent, RouterLink],
  templateUrl: './mikro-orm.component.html',
  styleUrl: './mikro-orm.component.css',
})
export class MikroOrmComponent {
  // Entities
  entities = `// src/entities/tenant.entity.ts
import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { User } from './user.entity';
import { Project } from './project.entity';

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity({ tableName: 'tenants' })
export class Tenant {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  name: string;

  @Property({ unique: true })
  slug: string;

  @Enum(() => Plan)
  plan: Plan = Plan.FREE;

  @Property({ type: 'json', default: {} })
  settings: Record<string, unknown> = {};

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @OneToMany(() => User, (user) => user.tenant)
  users = new Collection<User>(this);

  @OneToMany(() => Project, (project) => project.tenant)
  projects = new Collection<Project>(this);
}

// src/entities/user.entity.ts
import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  Index,
  Unique,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Tenant } from './tenant.entity';

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

@Entity({ tableName: 'users' })
@Unique({ properties: ['tenant', 'email'] }) // Tenant-scoped unique
@Index({ properties: ['tenant'] }) // Index for fast tenant queries
export class User {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  email: string;

  @Property({ nullable: true })
  name?: string;

  @Enum(() => Role)
  role: Role = Role.MEMBER;

  @ManyToOne(() => Tenant, { onDelete: 'cascade' })
  tenant: Tenant;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

// src/entities/project.entity.ts
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Index,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Tenant } from './tenant.entity';

@Entity({ tableName: 'projects' })
@Index({ properties: ['tenant'] })
export class Project {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  name: string;

  @Property({ nullable: true, type: 'text' })
  description?: string;

  @ManyToOne(() => Tenant, { onDelete: 'cascade' })
  tenant: Tenant;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}`;

  // Global filter
  globalFilter = `// src/database/tenant.filter.ts
import { Filter } from '@mikro-orm/core';

/**
 * MikroORM global filter for automatic tenant scoping.
 * Apply this to any entity that needs tenant isolation.
 */
export const TenantFilter = () =>
  Filter({
    name: 'tenant',
    cond: (args: { tenantId: string }) => ({
      tenant: { id: args.tenantId },
    }),
    default: true, // Enable by default
  });

// Usage: Apply decorator to entity
// @Entity()
// @TenantFilter()
// export class User { ... }`;

  // Base repository
  baseRepository = `// src/database/tenant-base.repository.ts
import { EntityRepository, EntityManager, FilterQuery, FindOptions } from '@mikro-orm/core';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

/**
 * Base repository with automatic tenant scoping for MikroORM.
 */
export abstract class TenantBaseRepository<T extends { tenant: any }> {
  constructor(
    protected readonly em: EntityManager,
    protected readonly tenantContext: TenantContextService,
    protected readonly entityName: string,
  ) {}

  protected get tenantId(): string {
    const id = this.tenantContext.getTenantId();
    if (!id) {
      throw new Error('No tenant context available');
    }
    return id;
  }

  /**
   * Get a forked EntityManager with tenant filter enabled
   */
  protected getEm(): EntityManager {
    const fork = this.em.fork();
    fork.setFilterParams('tenant', { tenantId: this.tenantId });
    return fork;
  }

  /**
   * Add tenant filter to where clause
   */
  protected scopeWhere(where?: FilterQuery<T>): FilterQuery<T> {
    return {
      ...where,
      tenant: { id: this.tenantId },
    } as FilterQuery<T>;
  }

  async findAll(options?: FindOptions<T>): Promise<T[]> {
    return this.getEm().find(this.entityName as any, {}, options);
  }

  async findOne(where: FilterQuery<T>): Promise<T | null> {
    return this.getEm().findOne(this.entityName as any, this.scopeWhere(where));
  }

  async findById(id: string): Promise<T | null> {
    return this.getEm().findOne(this.entityName as any, {
      id,
      tenant: { id: this.tenantId },
    } as FilterQuery<T>);
  }

  async create(data: Partial<T>): Promise<T> {
    const em = this.getEm();
    const tenant = await em.findOneOrFail('Tenant', { id: this.tenantId });

    const entity = em.create(this.entityName as any, {
      ...data,
      tenant,
    });

    await em.persistAndFlush(entity);
    return entity as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const em = this.getEm();
    const entity = await em.findOne(this.entityName as any, {
      id,
      tenant: { id: this.tenantId },
    } as FilterQuery<T>);

    if (!entity) return null;

    em.assign(entity, data);
    await em.flush();
    return entity as T;
  }

  async delete(id: string): Promise<boolean> {
    const em = this.getEm();
    const entity = await em.findOne(this.entityName as any, {
      id,
      tenant: { id: this.tenantId },
    } as FilterQuery<T>);

    if (!entity) return false;

    await em.removeAndFlush(entity);
    return true;
  }

  async count(where?: FilterQuery<T>): Promise<number> {
    return this.getEm().count(this.entityName as any, this.scopeWhere(where));
  }
}`;

  // Users repository
  usersRepository = `// src/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { TenantBaseRepository } from '../database/tenant-base.repository';
import { User, Role } from '../entities/user.entity';

@Injectable()
export class UsersRepository extends TenantBaseRepository<User> {
  constructor(
    em: EntityManager,
    tenantContext: TenantContextService,
  ) {
    super(em, tenantContext, 'User');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email } as any);
  }

  async findByRole(role: Role): Promise<User[]> {
    const em = this.getEm();
    return em.find(User, {
      role,
      tenant: { id: this.tenantId },
    });
  }

  async search(query: string, options?: { limit?: number; offset?: number }): Promise<User[]> {
    const em = this.getEm();
    const qb = em.createQueryBuilder(User, 'u');

    return qb
      .where({
        tenant: { id: this.tenantId },
        $or: [
          { name: { $ilike: \`%\${query}%\` } },
          { email: { $ilike: \`%\${query}%\` } },
        ],
      })
      .limit(options?.limit ?? 20)
      .offset(options?.offset ?? 0)
      .orderBy({ createdAt: 'DESC' })
      .getResultList();
  }

  async getStats(): Promise<{ total: number; byRole: Record<string, number> }> {
    const em = this.getEm();
    const qb = em.createQueryBuilder(User, 'u');

    const [total, byRole] = await Promise.all([
      this.count(),
      qb
        .select(['role', 'count(*) as count'])
        .where({ tenant: { id: this.tenantId } })
        .groupBy('role')
        .execute(),
    ]);

    return {
      total,
      byRole: (byRole as any[]).reduce(
        (acc, { role, count }) => ({ ...acc, [role]: parseInt(count, 10) }),
        {},
      ),
    };
  }
}`;

  // MikroORM config
  mikroOrmConfig = `// src/mikro-orm.config.ts
import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';

const config: Options<PostgreSqlDriver> = {
  driver: PostgreSqlDriver,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  entities: [Tenant, User, Project],
  metadataProvider: TsMorphMetadataProvider,
  debug: process.env.NODE_ENV === 'development',

  // Global filters
  filters: {
    tenant: {
      cond: (args: { tenantId: string }) => ({
        tenant: { id: args.tenantId },
      }),
      entity: ['User', 'Project'], // Apply to these entities
      default: true,
    },
  },
};

export default config;`;

  // App module
  appModule = `// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { EntityManager } from '@mikro-orm/core';
import mikroOrmConfig from './mikro-orm.config';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MikroOrmModule.forRoot(mikroOrmConfig),
    MikroOrmModule.forFeature([Tenant, User, Project]),

    MultiTenantModule.forRootAsync({
      useFactory: (em: EntityManager) => ({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        requireTenant: false,
        excludeRoutes: ['/health', '/api/auth/login'],

        tenantResolver: async (tenantId: string) => {
          const tenant = await em.findOne(Tenant, { id: tenantId });
          if (!tenant) return null;

          return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
            settings: tenant.settings,
          };
        },
      }),
      inject: [EntityManager],
    }),

    UsersModule,
  ],
})
export class AppModule {}`;

  // Users service
  usersService = `// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(params?: { search?: string; limit?: number; offset?: number }) {
    if (params?.search) {
      return this.usersRepository.search(params.search, {
        limit: params.limit,
        offset: params.offset,
      });
    }
    return this.usersRepository.findAll({
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
      orderBy: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    return this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      role: dto.role ?? 'MEMBER',
    } as any);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepository.update(id, dto as any);
    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return user;
  }

  async remove(id: string) {
    const deleted = await this.usersRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return { success: true };
  }

  async getStats() {
    return {
      tenantId: this.tenantContext.getTenantId(),
      ...(await this.usersRepository.getStats()),
    };
  }
}`;

  // Query builder
  queryBuilder = `// Advanced: Using MikroORM QueryBuilder with tenant scope
import { EntityManager, QueryBuilder } from '@mikro-orm/core';

@Injectable()
export class AdvancedUsersService {
  constructor(
    private readonly em: EntityManager,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Create a QueryBuilder pre-scoped to current tenant
   */
  private createTenantQb<T>(entityClass: new () => T, alias: string): QueryBuilder<T> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant context');
    }

    const em = this.em.fork();
    em.setFilterParams('tenant', { tenantId });

    return em.createQueryBuilder(entityClass, alias);
  }

  /**
   * Complex aggregation query
   */
  async getUsersWithProjectCount() {
    const qb = this.createTenantQb(User, 'u');

    return qb
      .select([
        'u.id',
        'u.name',
        'u.email',
        'u.role',
        'count(p.id) as projectCount',
      ])
      .leftJoin('u.tenant.projects', 'p')
      .groupBy(['u.id', 'u.name', 'u.email', 'u.role'])
      .orderBy({ 'u.createdAt': 'DESC' })
      .execute();
  }

  /**
   * Bulk update with tenant scope
   */
  async bulkUpdateRole(userIds: string[], role: Role) {
    const tenantId = this.tenantContext.getTenantId();
    const em = this.em.fork();

    return em
      .createQueryBuilder(User)
      .update({ role })
      .where({
        id: { $in: userIds },
        tenant: { id: tenantId },
      })
      .execute();
  }
}`;

  // Unit of work
  unitOfWork = `// Using Unit of Work pattern with transactions
async transferOwnership(fromUserId: string, toUserId: string) {
  const tenantId = this.tenantContext.getTenantId();
  const em = this.em.fork();

  // Enable tenant filter
  em.setFilterParams('tenant', { tenantId });

  // All operations in this unit of work are automatically transactional
  const fromUser = await em.findOneOrFail(User, { id: fromUserId });
  const toUser = await em.findOneOrFail(User, { id: toUserId });

  if (fromUser.role !== Role.OWNER) {
    throw new Error('Source user is not an owner');
  }

  // Update roles
  fromUser.role = Role.ADMIN;
  toUser.role = Role.OWNER;

  // Flush all changes in a single transaction
  await em.flush();

  return { fromUser, toUser };
}`;
}
