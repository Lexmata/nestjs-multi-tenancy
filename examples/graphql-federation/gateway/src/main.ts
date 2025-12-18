import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(4000);
  console.log('🚀 Apollo Gateway running on http://localhost:4000/graphql');
  console.log('');
  console.log('Make sure Users Subgraph is running on port 4001');
  console.log('');
  console.log('Try:');
  console.log('  curl -X POST http://localhost:4000/graphql \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -H "X-Tenant-ID: acme" \\');
  console.log('    -d \'{"query": "{ users { id email } }"}\'');
}

bootstrap();
