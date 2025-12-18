import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService, Tenant } from '@lexmata/nestjs-multi-tenant';

interface TenantWithDb extends Tenant {
  databaseUrl: string;
}

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  // Connection pool: one PrismaClient per tenant database
  private clients = new Map<string, PrismaClient>();

  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Get PrismaClient for current tenant
   */
  getClient(): PrismaClient {
    const tenant = this.tenantContext.getTenant<TenantWithDb>();

    if (!tenant) {
      throw new Error('No tenant in context');
    }

    return this.getOrCreateClient(tenant.id, tenant.databaseUrl);
  }

  /**
   * Get PrismaClient for a specific tenant (admin operations)
   */
  getClientForTenant(tenantId: string, databaseUrl: string): PrismaClient {
    return this.getOrCreateClient(tenantId, databaseUrl);
  }

  private getOrCreateClient(tenantId: string, databaseUrl: string): PrismaClient {
    let client = this.clients.get(tenantId);

    if (!client) {
      client = new PrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
      });

      // Connect immediately
      client.$connect();

      this.clients.set(tenantId, client);
      console.log(`Created Prisma client for tenant: ${tenantId}`);
    }

    return client;
  }

  /**
   * Disconnect a specific tenant's client
   */
  async disconnectTenant(tenantId: string): Promise<void> {
    const client = this.clients.get(tenantId);
    if (client) {
      await client.$disconnect();
      this.clients.delete(tenantId);
      console.log(`Disconnected Prisma client for tenant: ${tenantId}`);
    }
  }

  /**
   * Disconnect all clients on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.$disconnect(),
    );
    await Promise.all(disconnectPromises);
    this.clients.clear();
  }
}
