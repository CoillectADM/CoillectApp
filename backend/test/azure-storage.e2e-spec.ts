/**
 * Azure Storage de verdade: fila de notificações (Queue Storage) e comprovantes
 * de coleta (Blob Storage). No CI roda contra o Azurite, o emulador oficial
 * da Microsoft. Sem AZURE_STORAGE_CONNECTION_STRING o arquivo é pulado.
 *
 * Rodar localmente:
 *   docker run -d -p 10000:10000 -p 10001:10001 mcr.microsoft.com/azure-storage/azurite
 *   docker compose up -d db   (e DATABASE_HOST=localhost DATABASE_PORT=5482)
 *   AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true npm run test:e2e:azure
 * ATENÇÃO: o teste reinicia os dados de demonstração do banco usado.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  AzureBlobContainer,
  AzureQueue,
  parseConnectionString,
} from '../src/cloud/azure-storage.client';
import {
  DEMO_COMPANY,
  DEMO_MAIN_CONDOMINIUM,
  DEMO_MAIN_SENSOR,
  DEMO_PASSWORD_DEFAULT,
  DEMO_SINDICO,
  DEMO_SITES,
} from '../src/demo/demo-data';

const connection = process.env.AZURE_STORAGE_CONNECTION_STRING;
const azure = connection ? describe : describe.skip;

/** Espera algo acontecer (a fila é assíncrona): tenta a cada 250 ms. */
async function waitFor<T>(
  what: string,
  probe: () => Promise<T | null | undefined | false>,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value) return value as T;
    if (Date.now() > deadline) throw new Error(`Tempo esgotado esperando: ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

azure('Azure Storage: fila de notificações e comprovantes no Blob (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let sindicoToken: string;
  let companyToken: string;
  let requestId: number;

  const password = process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT;
  const auth = (token: string) => (req: any) => req.set('Authorization', `Bearer ${token}`);
  const asSindico = (req: any) => auth(sindicoToken)(req);
  const asCompany = (req: any) => auth(companyToken)(req);
  const cloud = async () => (await request(http).get('/api/admin/cloud').expect(200)).body.data;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = app.getHttpServer();

    await request(http).post('/api/admin/demo/reset').expect(200);
    sindicoToken = (
      await request(http)
        .post('/api/auth/login')
        .send({ email: DEMO_SINDICO.email, password })
        .expect(201)
    ).body.access_token;
    companyToken = (
      await request(http)
        .post('/api/auth/company/login')
        .send({ email: DEMO_COMPANY.email, password })
        .expect(201)
    ).body.access_token;
  });

  afterAll(async () => {
    if (app) {
      await request(http).post('/api/admin/demo/reset');
      await app.close();
    }
  });

  it('API em modo azure: container e fila criados no Storage', async () => {
    const health = await request(http).get('/api/health').expect(200);
    expect(health.body.data.storage).toBe('azure');
    const status = await cloud();
    expect(status).toMatchObject({
      mode: 'azure',
      blob: { container: 'comprovantes-coleta', error: null },
      queue: { name: 'coillect-notificacoes', poisonQueue: 'coillect-notificacoes-poison' },
    });
    expect(status.blob.provider).toContain('Azure Blob Storage');
    expect(status.queue.provider).toContain('Azure Queue Storage');
  });

  it('alerta do sensor: solicitação na hora; avisos chegam pela fila do Azure', async () => {
    const alert = await request(http)
      .post('/api/sensor-alert')
      .send({ sensorId: DEMO_MAIN_SENSOR, percentual: 88 })
      .expect(201);
    expect(alert.body.data.collection.triggered).toBe(true);
    requestId = alert.body.data.collection.request.id;

    const notice = await waitFor('aviso da empresa', async () => {
      const res = await asCompany(request(http).get('/api/notifications/company')).expect(200);
      return res.body.data.find(
        (n: any) => n.requestId === requestId && n.type === 'COLLECTION_REQUESTED',
      );
    });
    expect(notice.message).toContain('88%');
    await waitFor('cópia do síndico', async () => {
      const res = await asSindico(request(http).get('/api/notifications/mine')).expect(200);
      return res.body.data.find(
        (n: any) => n.requestId === requestId && n.type === 'COLLECTION_REQUESTED',
      );
    });

    const status = await cloud();
    expect(status.queue.published).toBeGreaterThanOrEqual(1);
    expect(status.queue.processed).toBeGreaterThanOrEqual(1);
    expect(status.queue.fallbacks).toBe(0);
  });

  it('empresa agenda e conclui; comprovante gravado no Blob Storage', async () => {
    await asCompany(
      request(http).post('/api/collection-request/company/schedule').send({ sensorId: DEMO_MAIN_SENSOR }),
    ).expect(201);
    await asCompany(
      request(http).post(`/api/collection-request/${requestId}/company-complete`).send({}),
    ).expect(201);

    const view = await waitFor('comprovante no Blob', async () => {
      const res = await asSindico(request(http).get(`/api/collection-request/${requestId}/receipt`));
      return res.status === 200 ? res.body.data : null;
    });
    expect(view).toMatchObject({
      requestId,
      receipt: { solicitacaoId: requestId, condominio: { nome: DEMO_MAIN_CONDOMINIUM } },
      storage: { mode: 'azure', container: 'comprovantes-coleta' },
    });

    // O arquivo existe de verdade no container (lido direto pela API REST do Storage).
    const container = new AzureBlobContainer(parseConnectionString(connection), 'comprovantes-coleta');
    const raw = await container.download(view.storage.blob);
    expect(JSON.parse(raw.toString('utf8')).protocolo).toBe(view.receipt.protocolo);
    expect((await container.list()).map((b) => b.name)).toContain(view.storage.blob);

    await waitFor('síndico avisado da conclusão', async () => {
      const res = await asSindico(request(http).get('/api/notifications/mine')).expect(200);
      return res.body.data.find(
        (n: any) => n.requestId === requestId && n.type === 'COLLECTION_COMPLETED',
      );
    });
    const company = await asCompany(
      request(http).get(`/api/collection-request/company/${requestId}/receipt`),
    ).expect(200);
    expect(company.body.data.storage.blob).toBe(view.storage.blob);
  });

  it('consumidor pausado: a solicitação nasce na hora e o aviso espera na fila', async () => {
    const bosque = DEMO_SITES[1];
    await request(http).post('/api/admin/cloud/queue/pause').expect(201);
    expect((await cloud()).queue.paused).toBe(true);

    const alert = await request(http)
      .post('/api/sensor-alert')
      .send({ sensorId: bosque.sensorId, percentual: 95 })
      .expect(201);
    expect(alert.body.data.collection.triggered).toBe(true);
    const id = alert.body.data.collection.request.id;

    await waitFor('mensagem esperando na fila do Azure', async () => (await cloud()).queue.waiting >= 1);
    const before = await asCompany(request(http).get('/api/notifications/company')).expect(200);
    expect(before.body.data.find((n: any) => n.requestId === id)).toBeUndefined();

    await request(http).post('/api/admin/cloud/queue/resume').expect(201);
    await waitFor('aviso entregue depois de retomar', async () => {
      const res = await asCompany(request(http).get('/api/notifications/company')).expect(200);
      return res.body.data.find((n: any) => n.requestId === id && n.type === 'COLLECTION_REQUESTED');
    });
    expect((await cloud()).queue.paused).toBe(false);
  });

  it('"Precisa de ajuda?" chega à empresa pela fila', async () => {
    await asSindico(
      request(http).post('/api/help-request').send({ message: 'Teste pela fila do Azure', topic: 'SENSOR' }),
    ).expect(201);
    const notice = await waitFor('pedido de ajuda na empresa', async () => {
      const res = await asCompany(request(http).get('/api/notifications/company')).expect(200);
      return res.body.data.find((n: any) => n.type === 'HELP_REQUESTED');
    });
    expect(notice.message).toContain('Teste pela fila do Azure');
  });

  it('mensagem inválida vai para a poison queue', async () => {
    const account = parseConnectionString(connection);
    await new AzureQueue(account, 'coillect-notificacoes').send('isto não é JSON');
    const poison = new AzureQueue(account, 'coillect-notificacoes-poison');
    await waitFor('mensagem na poison queue', async () => (await poison.approximateCount()) >= 1);
    expect((await cloud()).queue.poisoned).toBeGreaterThanOrEqual(1);
  });

  it('a fila termina vazia: tudo processado e apagado, sem falhas', async () => {
    const status = await waitFor('fila vazia', async () => {
      const current = await cloud();
      return current.queue.waiting === 0 ? current : null;
    });
    expect(status.queue.failed).toBe(0);
  });
});
