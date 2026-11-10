/**
 * Fluxo completo do MVP contra um PostgreSQL real (o CI sobe um container).
 * Sensor → API (SensorAlertController) → listener → solicitação para a empresa,
 * do barril específico → aviso para a empresa e cópia/notificação para o síndico
 * → desktop acompanha → empresa agenda e conclui → barril volta a 0% → repetível.
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
  DEMO_MAIN_BARREL,
  DEMO_MAIN_CONDOMINIUM,
  DEMO_MAIN_SENSOR,
  DEMO_PASSWORD_DEFAULT,
  DEMO_SINDICO,
  DEMO_SITES,
} from '../src/demo/demo-data';

describe('Fluxo MVP Coillect (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let sindicoToken: string;
  let companyToken: string;
  let firstRequestId: number;

  const password = process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT;
  const bosque = DEMO_SITES[1];
  const auth = (token: string) => (req: any) =>
    req.set('Authorization', `Bearer ${token}`);
  const asSindico = (req: any) => auth(sindicoToken)(req);
  const asCompany = (req: any) => auth(companyToken)(req);

  /** Mesmo POST que o ESP32 e o sensor virtual fazem (AlertPayload do diagrama). */
  const sendAlert = (
    percentual: number,
    sensorId = DEMO_MAIN_SENSOR,
    dataHora: string | undefined = new Date().toISOString(),
  ) =>
    request(http)
      .post('/api/sensor-alert')
      .send({ sensorId, percentual, ...(dataHora ? { dataHora } : {}) });

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
      // Remove o que o teste cadastrou e deixa a demo no estado inicial.
      await request(http).post('/api/admin/demo/reset');
      const db = app.get(DataSource);
      await db.query(`DELETE FROM sensors WHERE code LIKE 'E2E-%'`);
      await db.query(`DELETE FROM barrels WHERE code LIKE 'E2E-%' OR code LIKE 'BRL-E2E-%'`);
      await db.query(`DELETE FROM condominiums WHERE name LIKE 'E2E %'`);
      await db.query(`DELETE FROM users WHERE email LIKE 'e2e-%@coillect.test'`);
      await db.query(`DELETE FROM companies WHERE email LIKE 'e2e-%@coillect.test'`);
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
      barrelCode: DEMO_MAIN_BARREL,
      condominiumName: DEMO_MAIN_CONDOMINIUM,
      condominiumNeighborhood: 'Jardim Paulista',
      companyName: DEMO_COMPANY.name,
      sindicoName: DEMO_SINDICO.name,
      level: 0,
      threshold: 80,
      openRequest: null,
    });
  });

  it('leitura abaixo do limite NÃO cria solicitação nem aviso', async () => {
    const dataHora = '2026-11-10T14:30:00-03:00';
    const res = await sendAlert(50, DEMO_MAIN_SENSOR, dataHora).expect(201);
    expect(res.body.data.reading).toMatchObject({ percentual: 50, level: 50, dataHora });
    expect(res.body.data.collection).toMatchObject({
      triggered: false,
      reason: 'BELOW_THRESHOLD',
      request: null,
    });
    expect(res.body.data.sensor).toMatchObject({ level: 50, online: true });

    const active = await asCompany(
      request(http).get('/api/collection-request/company/active'),
    ).expect(200);
    expect(active.body.data).toHaveLength(0);
    const notices = await asCompany(request(http).get('/api/notifications/company')).expect(200);
    expect(notices.body.data).toHaveLength(0);
  });

  it('leitura no limite cria UMA solicitação PENDING do barril para a empresa', async () => {
    const res = await sendAlert(86).expect(201);
    const collection = res.body.data.collection;
    expect(collection.triggered).toBe(true);
    expect(collection.reason).toBe('THRESHOLD_REACHED');
    expect(collection.request).toMatchObject({
      status: 'PENDING',
      origin: 'SENSOR',
      levelAtRequest: 86,
      condominiumName: DEMO_MAIN_CONDOMINIUM,
      barrel: { code: DEMO_MAIN_BARREL, threshold: 80 },
      sensor: { sensorId: DEMO_MAIN_SENSOR, condominiumName: DEMO_MAIN_CONDOMINIUM },
      company: { name: DEMO_COMPANY.name },
      user: { name: DEMO_SINDICO.name },
    });
    firstRequestId = collection.request.id;
  });

  it('novas leituras (rota e formato antigos) não duplicam a solicitação', async () => {
    const res = await request(http)
      .post('/api/sensor/readings')
      .send({ sensorId: DEMO_MAIN_SENSOR, level: 92 })
      .expect(201);
    expect(res.body.data.collection).toMatchObject({
      triggered: false,
      reason: 'REQUEST_ALREADY_OPEN',
    });
    expect(res.body.data.collection.request.id).toBe(firstRequestId);
  });

  it('empresa recebe a solicitação, o aviso e vê os barris clientes', async () => {
    const active = await asCompany(
      request(http).get('/api/collection-request/company/active'),
    ).expect(200);
    expect(active.body.data).toHaveLength(1);
    expect(active.body.data[0]).toMatchObject({
      id: firstRequestId,
      status: 'PENDING',
      barrel: { code: DEMO_MAIN_BARREL },
      sensor: { sensorId: DEMO_MAIN_SENSOR, level: 92 },
    });
    expect(JSON.stringify(active.body)).not.toContain('password');

    const notices = await asCompany(request(http).get('/api/notifications/company')).expect(200);
    expect(notices.body.data).toHaveLength(1);
    expect(notices.body.data[0]).toMatchObject({
      audience: 'EMPRESA',
      type: 'COLLECTION_REQUESTED',
      title: 'Nova solicitação de coleta',
      message: `${DEMO_MAIN_CONDOMINIUM} chegou a 86% de capacidade. Barril ${DEMO_MAIN_BARREL}.`,
      requestId: firstRequestId,
      read: false,
    });

    const clients = await asCompany(request(http).get('/api/sensor/company')).expect(200);
    expect(clients.body.data.length).toBeGreaterThanOrEqual(3);
    const main = clients.body.data.find((s: any) => s.sensorId === DEMO_MAIN_SENSOR);
    expect(main).toMatchObject({
      level: 92,
      needsCollection: true,
      condominiumNeighborhood: 'Jardim Paulista',
      openRequest: { id: firstRequestId, status: 'PENDING' },
    });
  });

  it('síndico recebe só a cópia/notificação da MESMA solicitação', async () => {
    const active = await asSindico(
      request(http).get('/api/collection-request/my-active'),
    ).expect(200);
    expect(active.body.data).toMatchObject({ id: firstRequestId, status: 'PENDING' });

    const notifications = await asSindico(
      request(http).get('/api/notifications/mine'),
    ).expect(200);
    expect(notifications.body.data).toHaveLength(1);
    expect(notifications.body.data[0]).toMatchObject({
      audience: 'SINDICO',
      type: 'COLLECTION_REQUESTED',
      read: false,
      requestId: firstRequestId,
    });
  });

  it('síndico NÃO pode cancelar nem concluir a coleta gerada pelo sensor', async () => {
    const cancel = await asSindico(
      request(http).post(`/api/collection-request/${firstRequestId}/cancel`),
    ).expect(403);
    expect(cancel.body.message).toContain('apenas acompanha');
    await asSindico(
      request(http).post(`/api/collection-request/${firstRequestId}/complete`),
    ).expect(403);

    const active = await asSindico(
      request(http).get('/api/collection-request/my-active'),
    ).expect(200);
    expect(active.body.data).toMatchObject({ id: firstRequestId, status: 'PENDING' });
  });

  it('desktop administrativo acompanha barris, sensores, leituras e solicitações', async () => {
    const res = await request(http).get('/api/admin/overview').expect(200);
    const overview = res.body.data;
    expect(overview.counts).toMatchObject({ openRequests: 1 });
    expect(overview.counts.barrels).toBeGreaterThanOrEqual(3);
    expect(overview.counts.sensorsOnline).toBeGreaterThanOrEqual(1);
    expect(overview.sensors.find((s: any) => s.sensorId === DEMO_MAIN_SENSOR)).toMatchObject({
      level: 92,
      needsCollection: true,
    });
    expect(overview.requests[0]).toMatchObject({ id: firstRequestId, status: 'PENDING' });

    const readings = await request(http)
      .get(`/api/admin/readings?sensorId=${DEMO_MAIN_SENSOR}`)
      .expect(200);
    expect(readings.body.data.map((r: any) => r.level)).toEqual([92, 86, 50]);
    expect(readings.body.data[2].dataHora).toBe('2026-11-10T14:30:00-03:00');
  });

  it('"Agendar coleta" no barril com alerta aceita a MESMA solicitação', async () => {
    const when = '2026-11-12T17:00:00.000Z';
    const res = await asCompany(
      request(http)
        .post('/api/collection-request/company/schedule')
        .send({ sensorId: DEMO_MAIN_SENSOR, scheduledDate: when }),
    ).expect(201);
    expect(res.body.data).toMatchObject({
      id: firstRequestId,
      status: 'SCHEDULED',
      origin: 'SENSOR',
    });
    expect(new Date(res.body.data.scheduledDate).toISOString()).toBe(when);

    const notifications = await asSindico(
      request(http).get('/api/notifications/mine'),
    ).expect(200);
    expect(notifications.body.data[0]).toMatchObject({
      type: 'COLLECTION_SCHEDULED',
      requestId: firstRequestId,
    });
    expect(notifications.body.data[0].message).toContain('12/11');
  });

  it('empresa conclui a coleta; barril volta a 0% e síndico é avisado', async () => {
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

    const status = await request(http)
      .get(`/api/sensor/${DEMO_MAIN_SENSOR}/status`)
      .expect(200);
    expect(status.body.data.lastCollectionAt).toBe(barrel.body.data.lastCollectionAt);

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

  it('empresa agenda a coleta de um barril ANTES do alerta (origem COMPANY)', async () => {
    const res = await asCompany(
      request(http)
        .post('/api/collection-request/company/schedule')
        .send({ sensorId: bosque.sensorId }),
    ).expect(201);
    const scheduled = res.body.data;
    expect(scheduled).toMatchObject({
      status: 'SCHEDULED',
      origin: 'COMPANY',
      levelAtRequest: bosque.level,
      condominiumName: bosque.condominium,
      barrel: { code: bosque.barrelCode },
      user: null,
    });
    expect(scheduled.scheduledDate).toBeTruthy();

    // A empresa não recebe aviso da coleta que ela mesma agendou.
    const notices = await asCompany(request(http).get('/api/notifications/company')).expect(200);
    expect(notices.body.data).toHaveLength(1);

    // O alerta do sensor desse barril não cria uma segunda coleta.
    const alert = await sendAlert(90, bosque.sensorId).expect(201);
    expect(alert.body.data.collection).toMatchObject({
      triggered: false,
      reason: 'REQUEST_ALREADY_OPEN',
      request: { id: scheduled.id },
    });

    await asCompany(
      request(http).post(`/api/collection-request/${scheduled.id}/company-complete`).send({}),
    ).expect(201);
    const clients = await asCompany(request(http).get('/api/sensor/company')).expect(200);
    expect(
      clients.body.data.find((s: any) => s.sensorId === bosque.sensorId),
    ).toMatchObject({ level: 0, openRequest: null });

    await asCompany(
      request(http)
        .post('/api/collection-request/company/schedule')
        .send({ sensorId: 'NAO-EXISTE' }),
    ).expect(404);
    await asCompany(
      request(http).post('/api/collection-request/company/schedule').send({}),
    ).expect(400);
  });

  it('após a coleta, só abre outra solicitação depois de o sensor ler o barril vazio', async () => {
    // O sensor ainda lê o barril cheio (ex.: barril simulado no Wokwi não foi esvaziado).
    const still = await sendAlert(85).expect(201);
    expect(still.body.data.collection).toMatchObject({
      triggered: false,
      reason: 'AWAITING_EMPTY_READING',
      request: null,
    });
    const notices = await asCompany(request(http).get('/api/notifications/company')).expect(200);
    expect(notices.body.data).toHaveLength(1);

    // O coletor esvaziou o barril: o sensor lê ~0% e o ciclo recomeça.
    const empty = await sendAlert(3).expect(201);
    expect(empty.body.data.collection.reason).toBe('BELOW_THRESHOLD');
  });

  it('o fluxo pode ser repetido: nova leitura no limite gera nova solicitação', async () => {
    const res = await sendAlert(81).expect(201);
    expect(res.body.data.collection.triggered).toBe(true);
    expect(res.body.data.collection.request.id).not.toBe(firstRequestId);

    const conflict = await asCompany(
      request(http).post(`/api/collection-request/${firstRequestId}/accept`).send({}),
    ).expect(409);
    expect(conflict.body.message).toContain('COMPLETED');
  });

  it('síndico e empresa marcam notificações como lidas', async () => {
    const sindico = await asSindico(
      request(http).post('/api/notifications/read-all'),
    ).expect(201);
    expect(sindico.body.data.updated).toBeGreaterThanOrEqual(1);
    const unread = await asSindico(
      request(http).get('/api/notifications/mine?unread=true'),
    ).expect(200);
    expect(unread.body.data).toHaveLength(0);

    const notices = await asCompany(request(http).get('/api/notifications/company')).expect(200);
    const one = notices.body.data[0];
    const read = await asCompany(
      request(http).post(`/api/notifications/company/${one.id}/read`),
    ).expect(201);
    expect(read.body.data).toMatchObject({ id: one.id, read: true });
    await asCompany(request(http).post('/api/notifications/company/read-all')).expect(201);
    const companyUnread = await asCompany(
      request(http).get('/api/notifications/company?unread=true'),
    ).expect(200);
    expect(companyUnread.body.data).toHaveLength(0);
  });

  it('valida o contrato do sensor', async () => {
    await sendAlert(150).expect(400);
    await request(http).post('/api/sensor-alert').send({ sensorId: DEMO_MAIN_SENSOR }).expect(400);
    await request(http).post('/api/sensor-alert').send({ percentual: 50 }).expect(400);
    await request(http)
      .post('/api/sensor-alert')
      .send({ sensorId: DEMO_MAIN_SENSOR, percentual: 50, extra: 1 })
      .expect(400);
    await sendAlert(50, 'NAO-EXISTE').expect(404);
  });

  it('rotas do síndico e da empresa exigem token', async () => {
    await request(http).get('/api/sensor/mine').expect(401);
    await request(http).get('/api/collection-request/company/active').expect(401);
    await request(http).get('/api/notifications/company').expect(401);
    await request(http).post('/api/collection-request/company/schedule').send({}).expect(401);
  });

  it('admin cadastra síndico, empresa, condomínio, barril e sensor, e o fluxo funciona com eles', async () => {
    const stamp = Date.now();
    const sindicoEmail = `e2e-sindico-${stamp}@coillect.test`;
    const companyEmail = `e2e-empresa-${stamp}@coillect.test`;
    const cnpj = String(stamp).padStart(14, '0').slice(-14);

    const sindico = await request(http)
      .post('/api/admin/sindicos')
      .send({ name: 'E2E Síndica', email: sindicoEmail, password: 'Senha@123' })
      .expect(201);
    await request(http)
      .post('/api/admin/sindicos')
      .send({ name: 'Outra', email: sindicoEmail })
      .expect(409);
    const company = await request(http)
      .post('/api/admin/companies')
      .send({ name: 'E2E Coleta', email: companyEmail, cnpj, password: 'Senha@123' })
      .expect(201);
    await request(http)
      .post('/api/admin/companies')
      .send({ name: 'E2E Coleta', email: companyEmail, cnpj: '123' })
      .expect(400);

    const sindicoLogin = await request(http)
      .post('/api/auth/login')
      .send({ email: sindicoEmail, password: 'Senha@123' })
      .expect(201);
    const companyLogin = await request(http)
      .post('/api/auth/company/login')
      .send({ email: companyEmail, password: 'Senha@123' })
      .expect(201);

    const condominium = await request(http)
      .post('/api/admin/condominiums')
      .send({
        name: `E2E Condomínio ${stamp}`,
        neighborhood: 'Moema',
        sindicoId: sindico.body.data.id,
        companyId: company.body.data.id,
      })
      .expect(201);
    expect(condominium.body.data).toMatchObject({
      neighborhood: 'Moema',
      sindico: { email: sindicoEmail },
      company: { email: companyEmail },
    });

    const barrel = await request(http)
      .post('/api/admin/barrels')
      .send({
        code: `E2E-BRL-${stamp}`,
        condominiumId: condominium.body.data.id,
        capacityLiters: 100,
        alertThreshold: 75,
      })
      .expect(201);
    expect(barrel.body.data).toMatchObject({ alertThreshold: 75, sensors: [] });

    const code = `E2E-${stamp}`;
    const sensor = await request(http)
      .post('/api/admin/sensors')
      .send({ sensorId: code, barrelId: barrel.body.data.id })
      .expect(201);
    expect(sensor.body.data).toMatchObject({
      sensorId: code,
      barrelCode: `E2E-BRL-${stamp}`,
      threshold: 75,
      level: 0,
      sindicoName: 'E2E Síndica',
      companyName: 'E2E Coleta',
    });
    await request(http)
      .post('/api/admin/sensors')
      .send({ sensorId: `${code}-B`, barrelId: barrel.body.data.id })
      .expect(409);
    await request(http).post('/api/admin/sensors').send({ sensorId: code }).expect(409);

    const mine = await auth(sindicoLogin.body.access_token)(
      request(http).get('/api/sensor/mine'),
    ).expect(200);
    expect(mine.body.data.sensorId).toBe(code);

    const alert = await sendAlert(76, code).expect(201);
    expect(alert.body.data.collection).toMatchObject({
      triggered: true,
      request: {
        barrel: { code: `E2E-BRL-${stamp}` },
        user: { email: sindicoEmail },
        company: { name: 'E2E Coleta' },
      },
    });
    const companyActive = await auth(companyLogin.body.access_token)(
      request(http).get('/api/collection-request/company/active'),
    ).expect(200);
    expect(companyActive.body.data.map((r: any) => r.sensor?.sensorId)).toEqual([code]);
  });

  it('atalho antigo (sensor + condomínio) cria o barril; sensor sem barril não dispara coleta', async () => {
    const stamp = Date.now();
    const companies = await request(http).get('/api/admin/companies').expect(200);
    const demoCompany = companies.body.data.find((c: any) => c.email === DEMO_COMPANY.email);
    const condominium = await request(http)
      .post('/api/admin/condominiums')
      .send({ name: `E2E Atalho ${stamp}`, companyId: demoCompany.id })
      .expect(201);

    const code = `E2E-ATALHO-${stamp}`;
    const created = await request(http)
      .post('/api/admin/sensors')
      .send({ sensorId: code, condominiumId: condominium.body.data.id, threshold: 70 })
      .expect(201);
    expect(created.body.data).toMatchObject({
      sensorId: code,
      barrelCode: `BRL-${code}`,
      threshold: 70,
    });

    const solo = `E2E-SOLO-${stamp}`;
    await request(http).post('/api/admin/sensors').send({ sensorId: solo }).expect(201);
    const alert = await sendAlert(95, solo).expect(201);
    expect(alert.body.data.collection).toMatchObject({
      triggered: false,
      reason: 'SENSOR_NOT_INSTALLED',
      request: null,
    });
    await request(http)
      .patch(`/api/admin/sensors/${solo}`)
      .send({ threshold: 50 })
      .expect(409);
  });
});
