import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
  console.log('🚀 Basic Header Strategy Example running on http://localhost:3000');
  console.log('');
  console.log('Try these requests:');
  console.log('  curl -H "X-Tenant-ID: acme" http://localhost:3000/users');
  console.log('  curl -H "X-Tenant-ID: globex" http://localhost:3000/users');
  console.log('  curl http://localhost:3000/health');
}

bootstrap();
