import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { resolvePort } from './config/env';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  app.enableShutdownHooks();

  // Na cloud a plataforma informa PORT; localmente o padrão continua 3000.
  const port = resolvePort();
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `Coillect API na porta ${port} — rotas em /api, Swagger em /api/docs`,
    'Bootstrap',
  );
}
bootstrap();
