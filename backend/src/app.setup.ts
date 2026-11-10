import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';

/**
 * Configuração HTTP da API, compartilhada entre main.ts e os testes e2e
 * para que o teste exercite exatamente o mesmo app que roda na cloud.
 */
export function configureApp(app: INestApplication): INestApplication {
  // Prefixo global de rotas: tudo fica em /api/...
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS liberado (apps mobile, desktop e navegador)
  app.enableCors({ origin: true });

  // Ícones das empresas enviados por upload
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  const config = new DocumentBuilder()
    .setTitle('Coillect API')
    .setDescription(
      'MVP Coillect: sensor (físico ou virtual) → API → solicitação de coleta → ' +
        'app da empresa, cópia/notificação no app do síndico e acompanhamento no desktop administrativo.',
    )
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  return app;
}
