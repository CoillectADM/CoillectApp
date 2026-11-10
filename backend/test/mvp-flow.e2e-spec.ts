/**
 * Fluxo completo do MVP contra um PostgreSQL real (o CI sobe um container).
 * Sensor → API → listener → solicitação para a empresa → cópia/notificação
 * para o síndico → desktop acompanha → coleta concluída → fluxo repetível.
 *
 * Rodar localmente: suba o banco (docker compose up -d db), exporte
 * DATABASE_HOST=localhost DATABASE_PORT=5482 e rode `npm run test:e2e:mvp`.
 * ATENÇÃO: o teste reinicia os dados de demonstração do banco usado.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  DEMO_COMPANY,
  DEMO_MAIN_SENSOR,
  DEMO_PASSWORD_DEFAULT,
  DEMO_SINDICO,
} from '../src/demo/demo-data';

describe('Fluxo MVP Coillect (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let sindicoToken: string;
  let companyToken: string;
  let firstRequestId: number;

  const password = process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT;
  const asSindico = (req: any) =>
    req.set('Authorization', `Bearer ${sindicoToken}`);
  const asCompany = (req: any) =>
    req.set('Authorization', `Bearer ${companyToken}`);
  const sendReading = (level: number, sensorId = DEMO_MAIN_SENSOR) =>
    request(http).post('/api/sensor/readings').send({ sensorId, level });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = app.getHttpServer();

    await request(http).post('/api/admin/demo/reset').expect(200);

    const sindico = await request(http)
      .post('/api/auth/login')
      .send({ email: DEMO_SINDICO.email, password })
      .expect(201);
    sindicoToken = sindico.body.access_token;
    expect(sindico.body.role).toBe('user');

    const company = await request(http)
      .post('/api/auth/company/login')
      .send({ email: DEMO_COMPANY.email, password })
      .expect(201);
    companyToken = company.body.access_token;
    expect(company.body.role).toBe('company');
  });

  afterAll(async () => {
    if (app) {
      // Remove o sensor/condomínio criados pelo teste e deixa a demo no estado inicial.
      await request(http).post('/api/admin/demo/reset');
      const db = app.get(DataSource);
      await db.query(`DELETE FROM sensors WHERE code LIKE 'COI-E2E-%'`);
      await db.query(`DELETE FROM condominiums WHERE name LIKE 'E2E %'`);
      await app.close();
    }
  });

  it('health: API no ar e banco conectado', async () => {
    const res = await request(http).get('/api/health').expect(200);
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('síndico vê o barril do condomínio (sensor/mine)', async () => {
    const res = await asSindico(request(http).get('/api/sensor/mine')).expect(200);
    expect(res.body.data).toMatchObject({
      sensorId: DEMO_MAIN_SENSOR,
      condominiumName: 'Condomínio Demonstração',
      companyName: DEMO_COMPANY.name,
      level: 0,
      threshold: 80,
      openRequest: null,
    });
  });

  it('leitura abaixo do limite NÃO cria solicitação', async () => {
    const res = await sendReading(50).expect(201);
    expect(res.body.data.collection).toMatchObject({
      triggered: false,
      reason: 'BELOW_THRESHOLD',
      request: null,
    });
    expect(res.body.data.sensor.level).toBe(50);

    const active = await asCompany(
      request(http).get('/api/collection-request/company/active'),
    ).expect(200);
    expect(active.body.data).toHaveLength(0);
  });

  it('leitura no limite cria UMA solicitação PENDING para a empresa', async () => {
    const res = await sendReading(85).expect(201);
    const collection = res.body.data.collection;
    expect(collection.triggered).toBe(true);
    expect(collection.reason).toBe('THRESHOLD_REACHED');
    expect(collection.request).toMatchObject({
      status: 'PENDING',
      origin: 'SENSOR',
      levelAtRequest: 85,
      sensor: { sensorId: DEMO_MAIN_SENSOR, condominiumName: 'Condomínio Demonstração' },
      company: { name: DEMO_COMPANY.name },
      user: { name: DEMO_SINDICO.name },
    });
    firstRequestId = collection.request.id;
  });

  it('novas leituras com a coleta aberta não duplicam a solicitação', async () => {
    const res = await sendReading(92).expect(201);
    expect(res.body.data.collection).toMatchObject({
      triggered: false,
      reason: 'REQUEST_ALREADY_OPEN',
    });
    expect(res.body.data.collection.request.id).toBe(firstRequestId);
  });

  it('empresa recebe a solicitação principal e vê os barris clientes', async () => {
    const active = await asCompany(
      request(http).get('/api/collection-request/company/active'),
    ).expect(200);
    expect(active.body.data).toHaveLength(1);
    expect(active.body.data[0]).toMatchObject({
      id: firstRequestId,
      status: 'PENDING',
      sensor: { sensorId: DEMO_MAIN_SENSOR, level: 92 },
    });
    expect(JSON.stringify(active.body)).not.toContain('password');

    const clients = await asCompany(request(http).get('/api/sensor/company')).expect(200);
    const main = clients.body.data.find((s: any) => s.sensorId === DEMO_MAIN_SENSOR);
    expect(clients.body.data.length).toBeGreaterThanOrEqual(3);
    expect(main).toMatchObject({ level: 92, openRequest: { id: firstRequestId } });
  });

  it('síndico recebe a cópia/notificação vinculada à MESMA solicitação', async () => {
    const active = await asSindico(
      request(http).get('/api/collection-request/my-active'),
    ).expect(200);
    expect(active.body.data).toMatchObject({ id: firstRequestId, status: 'PENDING' });

    const notifications = await asSindico(
      request(http).get('/api/notifications/mine'),
    ).expect(200);
    expect(notifications.body.data).toHaveLength(1);
    expect(notifications.body.data[0]).toMatchObject({
      type: 'COLLECTION_REQUESTED',
      read: false,
      requestId: firstRequestId,
    });
  });

  it('desktop administrativo acompanha sensores e solicitações', async () => {
    const res = await request(http).get('/api/admin/overview').expect(200);
    const overview = res.body.data;
    expect(overview.counts.openRequests).toBe(1);
    expect(overview.sensors.find((s: any) => s.sensorId === DEMO_MAIN_SENSOR)).toMatchObject({
      level: 92,
      needsCollection: true,
    });
    expect(overview.requests[0]).toMatchObject({ id: firstRequestId, status: 'PENDING' });

    const readings = await request(http)
      .get(`/api/admin/readings?sensorId=${DEMO_MAIN_SENSOR}`)
      .expect(200);
    expect(readings.body.data.map((r: any) => r.level)).toEqual([92, 85, 50]);
  });

  it('empresa inicia e conclui a coleta; barril volta a 0% e síndico é avisado', async () => {
    const started = await asCompany(
      request(http).post(`/api/collection-request/${firstRequestId}/accept`).send({}),
    ).expect(201);
    expect(started.body.data.status).toBe('SCHEDULED');

    const inProgress = await asCompany(
      request(http).get('/api/collection-request/company/active'),
    ).expect(200);
    expect(inProgress.body.data[0]).toMatchObject({ id: firstRequestId, status: 'SCHEDULED' });

    const done = await asCompany(
      request(http)
        .post(`/api/collection-request/${firstRequestId}/company-complete`)
        .send({}),
    ).expect(201);
    expect(done.body.data.status).toBe('COMPLETED');
    expect(done.body.data.completedAt).toBeTruthy();

    const barrel = await asSindico(request(http).get('/api/sensor/mine')).expect(200);
    expect(barrel.body.data).toMatchObject({ level: 0, openRequest: null });
    expect(barrel.body.data.lastCollectionAt).toBeTruthy();

    const active = await asSindico(
      request(http).get('/api/collection-request/my-active'),
    ).expect(200);
    expect(active.body.data).toBeNull();

    const notifications = await asSindico(
      request(http).get('/api/notifications/mine'),
    ).expect(200);
    expect(notifications.body.data.map((n: any) => n.type)).toEqual([
      'COLLECTION_COMPLETED',
      'COLLECTION_SCHEDULED',
      'COLLECTION_REQUESTED',
    ]);

    const empty = await asCompany(
      request(http).get('/api/collection-request/company/active'),
    ).expect(200);
    expect(empty.body.data).toHaveLength(0);
  });

  it('o fluxo pode ser repetido: nova leitura no limite gera nova solicitação', async () => {
    const res = await sendReading(81).expect(201);
    expect(res.body.data.collection.triggered).toBe(true);
    expect(res.body.data.collection.request.id).not.toBe(firstRequestId);

    const conflict = await asCompany(
      request(http).post(`/api/collection-request/${firstRequestId}/accept`).send({}),
    ).expect(409);
    expect(conflict.body.message).toContain('COMPLETED');
  });

  it('síndico marca notificações como lidas', async () => {
    const res = await asSindico(request(http).post('/api/notifications/read-all')).expect(201);
    expect(res.body.data.updated).toBeGreaterThanOrEqual(1);
    const unread = await asSindico(
      request(http).get('/api/notifications/mine?unread=true'),
    ).expect(200);
    expect(unread.body.data).toHaveLength(0);
  });

  it('valida o contrato do sensor', async () => {
    await sendReading(150).expect(400);
    await request(http).post('/api/sensor/readings').send({ level: 50 }).expect(400);
    await sendReading(50, 'NAO-EXISTE').expect(404);
  });

  it('rotas do síndico e da empresa exigem token', async () => {
    await request(http).get('/api/sensor/mine').expect(401);
    await request(http).get('/api/collection-request/company/active').expect(401);
  });

  it('admin cadastra condomínio e sensor novos (ex.: o ESP32 físico), que já podem enviar leituras', async () => {
    const companies = await request(http).get('/api/admin/companies').expect(200);
    const demoCompany = companies.body.data.find(
      (c: any) => c.email === DEMO_COMPANY.email,
    );
    const stamp = Date.now();

    const condominium = await request(http)
      .post('/api/admin/condominiums')
      .send({ name: `E2E Condomínio ${stamp}`, companyId: demoCompany.id })
      .expect(201);
    expect(condominium.body.data).toMatchObject({
      company: { id: demoCompany.id },
      sindico: null,
    });

    const code = `COI-E2E-${stamp}`;
    const created = await request(http)
      .post('/api/admin/sensors')
      .send({ sensorId: code, condominiumId: condominium.body.data.id, threshold: 70 })
      .expect(201);
    expect(created.body.data).toMatchObject({ sensorId: code, threshold: 70, level: 0 });

    await request(http)
      .post('/api/admin/sensors')
      .send({ sensorId: code })
      .expect(409);

    const reading = await sendReading(75, code).expect(201);
    expect(reading.body.data.collection).toMatchObject({
      triggered: true,
      request: { sensor: { sensorId: code }, user: null },
    });
  });
});
