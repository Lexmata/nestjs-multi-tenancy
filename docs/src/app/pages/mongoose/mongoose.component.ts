import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';

@Component({
  selector: 'app-mongoose',
  standalone: true,
  imports: [RouterLink, FaIconComponent, CodeBlockComponent],
  templateUrl: './mongoose.component.html',
  styleUrl: './mongoose.component.css',
})
export class MongooseComponent {
  faArrowLeft = faArrowLeft;

  // Step 1: Tenant schema
  tenantSchemaCode = `// src/schemas/tenant.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ type: Object, default: {} })
  settings: Record<string, unknown>;

  @Prop({ default: true })
  isActive: boolean;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);`;

  // Step 2: Tenant-aware schema
  userSchemaCode = `// src/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema, Query } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop()
  name: string;

  @Prop({ default: 'user', enum: ['admin', 'user', 'viewer'] })
  role: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound index for tenant + email uniqueness
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Index for common queries
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ tenantId: 1, isActive: 1 });`;

  // Step 3: Tenant-aware model factory
  modelFactoryCode = `// src/database/tenant-model.factory.ts
import { Injectable, Scope } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Document, Schema } from 'mongoose';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

@Injectable({ scope: Scope.REQUEST })
export class TenantModelFactory {
  constructor(
    @InjectConnection() private connection: Connection,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Get a model with automatic tenant filtering
   */
  getModel<T extends Document>(
    name: string,
    schema: Schema,
  ): Model<T> {
    const tenantId = this.tenantContext.getTenantId();
    
    if (!tenantId) {
      throw new Error(\`Cannot access \${name} model without tenant context\`);
    }

    // Get or create discriminator for tenant filtering
    const baseModel = this.connection.model<T>(name, schema);
    
    // Add tenant filter to all queries
    const tenantFilter = { tenantId };
    
    // Create a proxy that adds tenant filtering
    return new Proxy(baseModel, {
      get(target, prop) {
        const value = target[prop as keyof typeof target];
        
        if (typeof value === 'function') {
          // Wrap query methods
          if (['find', 'findOne', 'findById', 'count', 'countDocuments', 'exists'].includes(prop as string)) {
            return function(...args: any[]) {
              const query = value.apply(target, args);
              return query.where(tenantFilter);
            };
          }
          
          // Auto-set tenantId on create
          if (['create', 'insertMany'].includes(prop as string)) {
            return function(...args: any[]) {
              const [docs, ...rest] = args;
              const docsWithTenant = Array.isArray(docs)
                ? docs.map(d => ({ ...d, tenantId }))
                : { ...docs, tenantId };
              return value.call(target, docsWithTenant, ...rest);
            };
          }
          
          // Filter updates/deletes
          if (['updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndUpdate', 'findOneAndDelete'].includes(prop as string)) {
            return function(...args: any[]) {
              const [filter, ...rest] = args;
              return value.call(target, { ...filter, ...tenantFilter }, ...rest);
            };
          }
        }
        
        return value;
      },
    }) as Model<T>;
  }
}`;

  // Step 4: Plugin approach
  pluginCode = `// src/database/tenant.plugin.ts
import { Schema, Query, Document } from 'mongoose';
import { TenantContextService } from '@lexmata/nestjs-multi-tenant';

// Store tenant context reference (set during app bootstrap)
let tenantContextRef: TenantContextService | null = null;

export function setTenantContext(context: TenantContextService) {
  tenantContextRef = context;
}

export function tenantPlugin(schema: Schema) {
  // Add tenantId field if not present
  if (!schema.path('tenantId')) {
    schema.add({
      tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
      },
    });
  }

  // Pre-find middleware
  schema.pre(/^find/, function(this: Query<any, any>, next) {
    if (!tenantContextRef) return next();
    
    const tenantId = tenantContextRef.getTenantId();
    if (tenantId) {
      this.where({ tenantId });
    }
    next();
  });

  // Pre-count middleware
  schema.pre('countDocuments', function(this: Query<any, any>, next) {
    if (!tenantContextRef) return next();
    
    const tenantId = tenantContextRef.getTenantId();
    if (tenantId) {
      this.where({ tenantId });
    }
    next();
  });

  // Pre-save middleware
  schema.pre('save', function(this: Document & { tenantId?: string }, next) {
    if (!tenantContextRef) return next();
    
    if (this.isNew && !this.tenantId) {
      const tenantId = tenantContextRef.getTenantId();
      if (tenantId) {
        this.tenantId = tenantId;
      }
    }
    next();
  });

  // Pre-update middleware
  schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function(this: Query<any, any>, next) {
    if (!tenantContextRef) return next();
    
    const tenantId = tenantContextRef.getTenantId();
    if (tenantId) {
      this.where({ tenantId });
      
      // Prevent changing tenantId
      const update = this.getUpdate() as any;
      if (update?.$set?.tenantId || update?.tenantId) {
        delete update.$set?.tenantId;
        delete update.tenantId;
      }
    }
    next();
  });

  // Pre-delete middleware
  schema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function(this: Query<any, any>, next) {
    if (!tenantContextRef) return next();
    
    const tenantId = tenantContextRef.getTenantId();
    if (tenantId) {
      this.where({ tenantId });
    }
    next();
  });
}`;

  // Step 5: Database module
  moduleCode = `// src/database/database.module.ts
import { Module, Global, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantContextService, MultiTenantModule } from '@lexmata/nestjs-multi-tenant';
import { setTenantContext, tenantPlugin } from './tenant.plugin';
import { TenantModelFactory } from './tenant-model.factory';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Project, ProjectSchema } from '../schemas/project.schema';
import mongoose from 'mongoose';

// Apply tenant plugin globally
mongoose.plugin(tenantPlugin);

@Global()
@Module({
  imports: [
    MultiTenantModule,
    MongooseModule.forRoot(process.env.MONGODB_URI),
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  providers: [TenantModelFactory],
  exports: [MongooseModule, TenantModelFactory],
})
export class DatabaseModule implements OnModuleInit {
  constructor(private tenantContext: TenantContextService) {}

  onModuleInit() {
    // Set tenant context for plugin
    setTenantContext(this.tenantContext);
  }
}`;

  // Step 6: Service
  serviceCode = `// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantContextService, Tenant } from '@lexmata/nestjs-multi-tenant';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private tenantContext: TenantContextService,
  ) {}

  // Plugin automatically filters by tenant
  async findAll() {
    return this.userModel.find().exec();
  }

  async findOne(id: string) {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  // TenantId automatically set by plugin
  async create(data: { email: string; name?: string; role?: string }) {
    const user = new this.userModel(data);
    return user.save();
  }

  async update(id: string, data: Partial<User>) {
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  // Aggregation with tenant filter
  async countByRole() {
    const tenantId = this.tenantContext.getTenantId();
    return this.userModel.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
  }

  // Population with tenant awareness
  async findWithProjects(id: string) {
    return this.userModel
      .findById(id)
      .populate({
        path: 'projects',
        match: { tenantId: this.tenantContext.getTenantId() },
      })
      .exec();
  }
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
  findAll() {
    // Plugin automatically filters by tenant
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
    // tenantId automatically set by plugin
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
