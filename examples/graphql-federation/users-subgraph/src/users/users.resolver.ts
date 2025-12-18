import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TenantGuard, RequireTenant } from '@lexmata/nestjs-multi-tenant';
import { User } from './user.model';
import { UsersService } from './users.service';

interface GraphQLContext {
  tenantId: string;
  tenant: { id: string; name: string };
}

@Resolver(() => User)
@UseGuards(TenantGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User])
  @RequireTenant()
  async users(@Context() ctx: GraphQLContext): Promise<User[]> {
    console.log(`GraphQL: Fetching users for tenant ${ctx.tenantId}`);
    return this.usersService.findAll(ctx.tenantId);
  }

  @Query(() => User, { nullable: true })
  @RequireTenant()
  async user(@Args('id') id: string, @Context() ctx: GraphQLContext): Promise<User | null> {
    return this.usersService.findOne(ctx.tenantId, id);
  }

  @Mutation(() => User)
  @RequireTenant()
  async createUser(
    @Args('email') email: string,
    @Args('name', { nullable: true }) name: string | undefined,
    @Context() ctx: GraphQLContext,
  ): Promise<User> {
    return this.usersService.create(ctx.tenantId, { email, name });
  }
}
