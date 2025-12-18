import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(4001);
  console.log('🚀 Users Subgraph running on http://localhost:4001/graphql');
}

bootstrap();
