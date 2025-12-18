import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';

@Component({
  selector: 'app-sequelize',
  standalone: true,
  imports: [RouterLink, FaIconComponent, CodeBlockComponent],
  templateUrl: './sequelize.component.html',
  styleUrl: './sequelize.component.css',
})
export class SequelizeComponent {
  faArrowLeft = faArrowLeft;

  // Step 1: Model definition with tenant scope
  modelCode = `// src/models/user.model.ts
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Scopes } from 'sequelize-typescript';
import { Tenant } from './tenant.model';

@Scopes(() => ({
  // Default scope - always filter by tenant
  defaultScope: {
    // Will be set dynamically
  },
  // Explicit tenant scope
  forTenant: (tenantId: string) => ({
    where: { tenantId },
  }),
}))
@Table({ tableName: 'users', timestamps: true })
export class User extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenantId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  email: string;

  @Column({ type: DataType.STRING })
  name: string;

  @Column({ type: DataType.STRING, defaultValue: 'user' })
  role: string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;
}`;

  // Step 2: Tenant model
  tenantModelCode = `// src/models/tenant.model.ts
import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { Project } from './project.model';

@Table({ tableName: 'tenants', timestamps: true })
export class Tenant extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.STRING, unique: true, allowNull: false })
  slug: string;

  @Column({ type: DataType.JSONB, defaultValue: {} })
  settings: Record<string, unknown>;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive: boolean;

  @HasMany(() => User)
  users: User[];

  @HasMany(() => Project)
  projects: Project[];
}`;

  // Step 3: Tenant-aware hooks
  hooksCode = `// src/database/tenant-hooks.ts
import { Sequelize, Model } from 'sequelize-typescript';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

export function setupTenantHooks(sequelize: Sequelize, tenantContext: TenantContextService) {
  // Models that require tenant filtering
  const tenantModels = ['User', 'Project', 'Document', 'Task'];

  sequelize.addHook('beforeFind', (options: any) => {
    const modelName = options.model?.name;
    if (!tenantModels.includes(modelName)) return;

    const tenantId = tenantContext.getTenantId();
    if (!tenantId) return;

    // Add tenant filter to where clause
    options.where = {
      ...options.where,
      tenantId,
    };
  });

  sequelize.addHook('beforeCount', (options: any) => {
    const modelName = options.model?.name;
    if (!tenantModels.includes(modelName)) return;

    const tenantId = tenantContext.getTenantId();
    if (!tenantId) return;

    options.where = {
      ...options.where,
      tenantId,
    };
  });

  sequelize.addHook('beforeCreate', (instance: Model, options: any) => {
    const modelName = instance.constructor.name;
    if (!tenantModels.includes(modelName)) return;

    const tenantId = tenantContext.getTenantId();
    if (!tenantId) {
      throw new Error('Cannot create record without tenant context');
    }

    // Automatically set tenantId
    (instance as any).tenantId = tenantId;
  });

  sequelize.addHook('beforeBulkCreate', (instances: Model[], options: any) => {
    const modelName = instances[0]?.constructor.name;
    if (!tenantModels.includes(modelName)) return;

    const tenantId = tenantContext.getTenantId();
    if (!tenantId) {
      throw new Error('Cannot create records without tenant context');
    }

    instances.forEach((instance) => {
      (instance as any).tenantId = tenantId;
    });
  });

  sequelize.addHook('beforeUpdate', (instance: Model, options: any) => {
    const modelName = instance.constructor.name;
    if (!tenantModels.includes(modelName)) return;

    // Prevent changing tenantId
    if ((instance as any).changed('tenantId')) {
      throw new Error('Cannot change tenant of existing record');
    }
  });

  sequelize.addHook('beforeDestroy', (instance: Model, options: any) => {
    const modelName = instance.constructor.name;
    if (!tenantModels.includes(modelName)) return;

    const tenantId = tenantContext.getTenantId();
    if (!tenantId) return;

    // Verify record belongs to current tenant
    if ((instance as any).tenantId !== tenantId) {
      throw new Error('Cannot delete record from different tenant');
    }
  });
}`;

  // Step 4: Database module
  moduleCode = `// src/database/database.module.ts
import { Module, Global, OnModuleInit } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { TenantContextService, MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { setupTenantHooks } from './tenant-hooks';
import { Tenant } from '../models/tenant.model';
import { User } from '../models/user.model';
import { Project } from '../models/project.model';

@Global()
@Module({
  imports: [MultiTenantModule],
  providers: [
    {
      provide: Sequelize,
      useFactory: async (tenantContext: TenantContextService) => {
        const sequelize = new Sequelize({
          dialect: 'postgres',
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT),
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          models: [Tenant, User, Project],
          logging: false,
        });

        // Setup tenant hooks
        setupTenantHooks(sequelize, tenantContext);

        await sequelize.sync();
        return sequelize;
      },
      inject: [TenantContextService],
    },
  ],
  exports: [Sequelize],
})
export class DatabaseModule {}`;

  // Step 5: Service with scopes
  serviceCode = `// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TenantContextService, Tenant } from '@lexmata/nestjs-multi-tenant';
import { User } from '../models/user.model';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    private tenantContext: TenantContextService,
  ) {}

  // Hooks automatically filter by tenant
  async findAll() {
    return this.userModel.findAll();
  }

  // Explicit scope usage
  async findAllForTenant(tenantId: string) {
    return this.userModel.scope({ method: ['forTenant', tenantId] }).findAll();
  }

  async findOne(id: string) {
    return this.userModel.findByPk(id);
  }

  // TenantId automatically set by hook
  async create(data: { email: string; name?: string; role?: string }) {
    return this.userModel.create(data);
  }

  async update(id: string, data: Partial<User>) {
    const user = await this.findOne(id);
    if (!user) return null;
    return user.update(data);
  }

  async delete(id: string) {
    const user = await this.findOne(id);
    if (!user) return false;
    await user.destroy();
    return true;
  }

  // Raw query with tenant filter
  async countByRole(role: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.userModel.count({
      where: { role, tenantId },
    });
  }
}`;

  // Step 6: Dynamic schema switching
  schemaCode = `// src/database/schema-switcher.ts
import { Sequelize } from 'sequelize-typescript';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

// For PostgreSQL schema-per-tenant approach
export class TenantSchemaManager {
  constructor(
    private sequelize: Sequelize,
    private tenantContext: TenantContextService,
  ) {}

  // Create schema for new tenant
  async createTenantSchema(tenantId: string) {
    const schemaName = \`tenant_\${tenantId}\`;

    await this.sequelize.query(\`CREATE SCHEMA IF NOT EXISTS "\${schemaName}"\`);

    // Run migrations in tenant schema
    await this.runMigrationsForSchema(schemaName);

    return schemaName;
  }

  // Switch to tenant schema for current request
  async switchToTenantSchema() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant in context');
    }

    const schemaName = \`tenant_\${tenantId}\`;
    await this.sequelize.query(\`SET search_path TO "\${schemaName}", public\`);
  }

  // Reset to public schema
  async resetSchema() {
    await this.sequelize.query('SET search_path TO public');
  }

  private async runMigrationsForSchema(schemaName: string) {
    // Run Sequelize migrations for the schema
    // This would typically use sequelize-cli or umzug
  }
}

// Middleware to auto-switch schema
export function createSchemaMiddleware(schemaManager: TenantSchemaManager) {
  return async (req: any, res: any, next: any) => {
    try {
      await schemaManager.switchToTenantSchema();

      res.on('finish', async () => {
        await schemaManager.resetSchema();
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}`;

  // Step 7: Controller
  controllerCode = `// src/users/users.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TenantGuard, RequireTenant, CurrentTenant, TenantId, Tenant } from '@lexmata/nestjs-multi-tenant';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequireTenant()
  findAll(@CurrentTenant() tenant: Tenant) {
    // Hooks automatically filter by tenant.id
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequireTenant()
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequireTenant()
  create(@Body() data: { email: string; name?: string }) {
    // tenantId automatically set by hook
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
