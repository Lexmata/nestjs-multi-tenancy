import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
  console.log('🚀 Prisma Multi-DB Example running on http://localhost:3000');
  console.log('');
  console.log('This example demonstrates database-per-tenant pattern');
  console.log('Each tenant has their own PostgreSQL database');
  console.log('');
  console.log('Try:');
  console.log('  curl -H "X-Tenant-ID: acme" http://localhost:3000/users');
  console.log('  curl -H "X-Tenant-ID: globex" http://localhost:3000/users');
}

bootstrap();
