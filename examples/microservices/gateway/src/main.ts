import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
  console.log('🚀 API Gateway running on http://localhost:3000');
  console.log('');
  console.log('Make sure Users Service is running on port 3001');
  console.log('');
  console.log('Try:');
  console.log('  curl -H "X-Tenant-ID: acme" http://localhost:3000/users');
}

bootstrap();
