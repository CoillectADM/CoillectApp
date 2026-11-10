#!/usr/bin/env node
/**
 * Verificação rápida da API publicada (local ou cloud), sem dependências.
 * Percorre o ciclo da demonstração usando o MESMO contrato HTTP do sensor
 * (POST /sensor-alert { sensorId, percentual, dataHora }):
 *   leitura abaixo do limite → leitura no limite → solicitação do barril para a
 *   empresa + aviso da empresa → cópia/notificação do síndico (que não pode
 *   alterar a coleta) → empresa agenda e conclui → barril volta a 0%.
 *
 * Uso:  node scripts/smoke-flow.mjs <URL_DA_API> --reset
 *       ex.: node scripts/smoke-flow.mjs https://coillect-api.onrender.com/api --reset
 *
 * --reset é obrigatório porque o roteiro REINICIA os dados de demonstração.
 * Variáveis opcionais: DEMO_PASSWORD, SENSOR_ID.
 * Não é o sensor virtual: é só um teste de ponta a ponta.
 */
const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) || 'http://localhost:3000/api').replace(/\/+$/, '');
const password = process.env.DEMO_PASSWORD || 'Coillect@2025';
const sensorId = process.env.SENSOR_ID || 'CLT-8472-A';
const alert = (percentual) =>
  call('POST', 'sensor-alert', { body: { sensorId, percentual, dataHora: new Date().toISOString() } });

if (!args.includes('--reset')) {
  console.error('Este roteiro reinicia os dados de demonstração. Rode novamente com --reset.');
  process.exit(2);
}

let step = 0;
function check(condition, message, detail) {
  step += 1;
  if (!condition) {
    console.error(`✗ ${step}. ${message}`);
    if (detail !== undefined) console.error(JSON.stringify(detail, null, 2).slice(0, 2000));
    process.exit(1);
  }
  console.log(`✓ ${step}. ${message}`);
}

async function call(method, path, { token, body, expect = [200, 201] } = {}) {
  // expect: status HTTP aceitos para esta chamada
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90_000), // a cloud gratuita pode levar ~1 min para "acordar"
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!expect.includes(response.status)) {
    console.error(`✗ ${method} /${path} → HTTP ${response.status}`);
    console.error(text.slice(0, 2000));
    process.exit(1);
  }
  return json;
}

console.log(`API: ${base}`);

const health = await call('GET', 'health');
check(health?.data?.database === 'up', 'API no ar e banco conectado', health);

await call('POST', 'admin/demo/reset');
check(true, 'dados de demonstração reiniciados');

const sindico = await call('POST', 'auth/login', { body: { email: 'sindico@coillect.com', password } });
const empresa = await call('POST', 'auth/company/login', { body: { email: 'empresa@coillect.com', password } });
check(sindico.access_token && empresa.access_token, 'login do síndico e da empresa');

const low = await alert(40);
check(low.data.collection.triggered === false, 'leitura de 40% não cria solicitação', low.data.collection);

const high = await alert(85);
const created = high.data.collection.request;
check(high.data.collection.triggered === true && created?.status === 'PENDING' && created?.barrel?.code, `leitura de 85% criou a solicitação #${created?.id} do barril ${created?.barrel?.code}`, high.data.collection);

const again = await alert(90);
check(again.data.collection.triggered === false && again.data.collection.request?.id === created.id, 'nova leitura não duplica a solicitação', again.data.collection);

const companyActive = await call('GET', 'collection-request/company/active', { token: empresa.access_token });
check(companyActive.data.some((r) => r.id === created.id), 'empresa recebeu a solicitação', companyActive.data);

const notices = await call('GET', 'notifications/company', { token: empresa.access_token });
check(notices.data[0]?.requestId === created.id && /85% de capacidade/.test(notices.data[0]?.message), `empresa recebeu o aviso: "${notices.data[0]?.message}"`, notices.data);

const copy = await call('GET', 'collection-request/my-active', { token: sindico.access_token });
const notifications = await call('GET', 'notifications/mine', { token: sindico.access_token });
check(copy.data?.id === created.id && notifications.data[0]?.requestId === created.id, 'síndico recebeu a cópia/notificação da mesma solicitação', { copy: copy.data, notifications: notifications.data });

await call('POST', `collection-request/${created.id}/cancel`, { token: sindico.access_token, expect: [403] });
check(true, 'síndico não consegue cancelar a coleta gerada pelo sensor (403)');

const overview = await call('GET', 'admin/overview');
check(overview.data.counts.openRequests >= 1, 'desktop administrativo vê a solicitação em aberto', overview.data.counts);

const started = await call('POST', 'collection-request/company/schedule', { token: empresa.access_token, body: { sensorId } });
check(started.data.id === created.id && started.data.status === 'SCHEDULED', 'empresa agendou a coleta do barril (mesma solicitação)', started.data);

const done = await call('POST', `collection-request/${created.id}/company-complete`, { token: empresa.access_token, body: {} });
check(done.data.status === 'COMPLETED', 'empresa concluiu a coleta', done.data);

const barrel = await call('GET', 'sensor/mine', { token: sindico.access_token });
check(barrel.data.level === 0 && barrel.data.openRequest === null, 'barril voltou a 0% e não há coleta aberta', barrel.data);

await call('POST', 'admin/demo/reset');
console.log('\nFluxo completo OK. Dados de demonstração reiniciados para a apresentação.');
