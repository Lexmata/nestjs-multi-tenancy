import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';

@Component({
  selector: 'app-typeorm',
  standalone: true,
  imports: [CodeBlockComponent, RouterLink, FaIconComponent],
  templateUrl: './typeorm.component.html',
  styleUrl: './typeorm.component.css',
})
export class TypeormComponent {
  faArrowLeft = faArrowLeft;

  // Entity definitions
  entities = `// src/entities/tenant.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'enum', enum: Plan, default: Plan.FREE })
  plan: Plan;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Project, (project) => project.tenant)
  projects: Project[];
}

// src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { Tenant } from './tenant.entity';

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

@Entity('users')
@Unique(['tenantId', 'email']) // Tenant-scoped uniqueness
@Index(['tenantId']) // Index for fast tenant queries
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'enum', enum: Role, default: Role.MEMBER })
  role: Role;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// src/entities/project.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('projects')
@Index(['tenantId'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}`;

  // Base repository
  baseRepository = `// src/database/tenant-base.repository.ts
import { Repository, FindManyOptions, FindOneOptions, DeepPartial, FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

/**
 * Base repository that automatically scopes all queries to the current tenant.
 * Extend this class for any entity that has a tenantId field.
 */
export abstract class TenantBaseRepository<T extends { tenantId: string }> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly tenantContext: TenantContextService,
  ) {}

  protected get tenantId(): string {
    const id = this.tenantContext.getTenantId();
    if (!id) {
      throw new Error('No tenant context available');
    }
    return id;
  }

  /**
   * Add tenant filter to where clause
   */
  protected scopeWhere(where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (Array.isArray(where)) {
      return where.map((w) => ({ ...w, tenantId: this.tenantId } as FindOptionsWhere<T>));
    }
    return { ...where, tenantId: this.tenantId } as FindOptionsWhere<T>;
  }

  /**
   * Find all entities for the current tenant
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: this.scopeWhere(options?.where as FindOptionsWhere<T>),
    });
  }

  /**
   * Find one entity by criteria (scoped to tenant)
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne({
      ...options,
      where: this.scopeWhere(options.where as FindOptionsWhere<T>),
    });
  }

  /**
   * Find one entity by ID (scoped to tenant)
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id, tenantId: this.tenantId } as FindOptionsWhere<T>,
    });
  }

  /**
   * Create a new entity with automatic tenant assignment
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create({
      ...data,
      tenantId: this.tenantId,
    } as DeepPartial<T>);
    return this.repository.save(entity);
  }

  /**
   * Create multiple entities with automatic tenant assignment
   */
  async createMany(data: DeepPartial<T>[]): Promise<T[]> {
    const entities = data.map((d) =>
      this.repository.create({
        ...d,
        tenantId: this.tenantId,
      } as DeepPartial<T>),
    );
    return this.repository.save(entities);
  }

  /**
   * Update an entity (only if it belongs to current tenant)
   */
  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  /**
   * Delete an entity (only if it belongs to current tenant)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({
      id,
      tenantId: this.tenantId,
    } as FindOptionsWhere<T>);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Count entities for the current tenant
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count({
      ...options,
      where: this.scopeWhere(options?.where as FindOptionsWhere<T>),
    });
  }

  /**
   * Check if entity exists (scoped to tenant)
   */
  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({
      where: this.scopeWhere(where),
    });
    return count > 0;
  }
}`;

  // User repository
  usersRepository = `// src/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { TenantBaseRepository } from '../database/tenant-base.repository';
import { User, Role } from '../entities/user.entity';

@Injectable()
export class UsersRepository extends TenantBaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
    tenantContext: TenantContextService,
  ) {
    super(repository, tenantContext);
  }

  /**
   * Find user by email within the current tenant
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } as any });
  }

  /**
   * Find users by role within the current tenant
   */
  async findByRole(role: Role): Promise<User[]> {
    return this.findAll({ where: { role } as any });
  }

  /**
   * Search users by name or email
   */
  async search(query: string, options?: { skip?: number; take?: number }): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.tenantId = :tenantId', { tenantId: this.tenantId })
      .andWhere(
        '(user.name ILIKE :query OR user.email ILIKE :query)',
        { query: \`%\${query}%\` },
      )
      .skip(options?.skip ?? 0)
      .take(options?.take ?? 20)
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get user statistics for the current tenant
   */
  async getStats(): Promise<{ total: number; byRole: Record<string, number> }> {
    const [total, byRole] = await Promise.all([
      this.count(),
      this.repository
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('user.tenantId = :tenantId', { tenantId: this.tenantId })
        .groupBy('user.role')
        .getRawMany(),
    ]);

    return {
      total,
      byRole: byRole.reduce(
        (acc, { role, count }) => ({ ...acc, [role]: parseInt(count, 10) }),
        {},
      ),
    };
  }
}`;

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

  async findAll(params?: { skip?: number; take?: number; search?: string }) {
    if (params?.search) {
      return this.usersRepository.search(params.search, {
        skip: params.skip,
        take: params.take,
      });
    }

    return this.usersRepository.findAll({
      skip: params?.skip ?? 0,
      take: params?.take ?? 20,
      order: { createdAt: 'DESC' },
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
    // Check for existing user with same email in this tenant
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    return this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      role: dto.role ?? 'MEMBER',
      // tenantId is automatically added by the repository!
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepository.update(id, dto);
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

  // Database module
  databaseModule = `// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [Tenant, User, Project],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Tenant, User, Project]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}`;

  // App module
  appModule = `// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseModule } from './database/database.module';
import { Tenant } from './entities/tenant.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,

    // Configure multi-tenant module with TypeORM-based resolver
    MultiTenantModule.forRootAsync({
      imports: [DatabaseModule],
      useFactory: (tenantRepository: Repository<Tenant>) => ({
        extractionStrategy: 'header',
        tenantHeader: 'x-tenant-id',
        requireTenant: false,
        excludeRoutes: ['/health', '/api/auth/login', '/api/tenants'],

        // Resolve tenant from database using TypeORM
        tenantResolver: async (tenantId: string) => {
          const tenant = await tenantRepository.findOne({
            where: { id: tenantId },
            select: ['id', 'name', 'slug', 'plan', 'settings'],
          });

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
      inject: ['TenantRepository'],
    }),

    UsersModule,
  ],
  providers: [
    {
      provide: 'TenantRepository',
      useFactory: (repository: Repository<Tenant>) => repository,
      inject: [{ token: 'TenantRepository', optional: false }],
    },
  ],
})
export class AppModule {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}
}`;

  // Users module
  usersModule = `// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersRepository, UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}`;

  // Controller
  usersController = `// src/users/users.controller.ts
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
@RequireTenant()
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

  // Query builder approach
  queryBuilder = `// Alternative: Using QueryBuilder directly with tenant scope
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersQueryService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Create a query builder pre-scoped to the current tenant
   */
  private createTenantQuery(alias: string = 'user'): SelectQueryBuilder<User> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available');
    }

    return this.repository
      .createQueryBuilder(alias)
      .where(\`\${alias}.tenantId = :tenantId\`, { tenantId });
  }

  /**
   * Complex query with joins and aggregations
   */
  async getActiveUsersWithProjects() {
    return this.createTenantQuery('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'tenant.name',
        'tenant.plan',
      ])
      .where('user.role != :role', { role: 'MEMBER' })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Paginated query with total count
   */
  async findPaginated(page: number = 1, limit: number = 20) {
    const [users, total] = await this.createTenantQuery('user')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}`;

  // Subscriber for audit
  subscriber = `// src/database/tenant-audit.subscriber.ts
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

interface TenantEntity {
  tenantId?: string;
}

/**
 * TypeORM subscriber that automatically sets tenantId on insert
 * and validates tenant access on updates.
 */
@EventSubscriber()
@Injectable()
export class TenantAuditSubscriber implements EntitySubscriberInterface<TenantEntity> {
  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Auto-assign tenantId before insert if not already set
   */
  beforeInsert(event: InsertEvent<TenantEntity>) {
    if ('tenantId' in event.entity && !event.entity.tenantId) {
      const tenantId = this.tenantContext.getTenantId();
      if (tenantId) {
        event.entity.tenantId = tenantId;
      }
    }
  }

  /**
   * Validate tenant access before update
   */
  beforeUpdate(event: UpdateEvent<TenantEntity>) {
    if (event.entity && 'tenantId' in event.entity) {
      const tenantId = this.tenantContext.getTenantId();
      if (tenantId && event.entity.tenantId !== tenantId) {
        throw new Error('Cannot update entity belonging to another tenant');
      }
    }
  }
}`;
}
