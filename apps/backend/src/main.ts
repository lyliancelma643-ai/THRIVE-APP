import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS : front web (3001), backend/docs (3000), Expo web/dev (19006)
  app.enableCors({
    origin: [
      process.env.APP_URL || 'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:19006',
    ],
    credentials: true,
  });

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('THRIVE API')
    .setDescription('API backend de la plateforme THRIVE')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`🚀 THRIVE Backend running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
