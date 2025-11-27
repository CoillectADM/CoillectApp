import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefixo global de rotas
  app.setGlobalPrefix('api');

  // Pipes globais de validação
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS liberado
  app.enableCors({
    origin: true,
  });

    // servir uploads
  app.use(
    '/uploads',
    express.static(join(__dirname, '..', 'uploads')),
  );

  // 📘 Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Coillect API')
    .setDescription('Documentação interativa da API Coillect')
    .setVersion('1.0')
    .addBearerAuth() // adiciona suporte JWT (Authorization: Bearer)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Inicializa o servidor
  await app.listen(3000);
}
bootstrap();
