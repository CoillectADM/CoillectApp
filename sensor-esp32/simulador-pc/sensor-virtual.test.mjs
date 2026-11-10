// Testes do sensor virtual no PC: node --test sensor-esp32/simulador-pc/
// Usam uma API falsa local com as mesmas regras da API Coillect.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  AlertPayload,
  BarrilSimulado,
  FillLevelCalculator,
  RouterClient,
  SensorConfig,
  SensorController,
  UltrasonicSensor,
  dataHoraLocal,
  iniciar,
  normalizarApi,
} from './sensor-virtual.mjs';

const SCRIPT = fileURLToPath(new URL('./sensor-virtual.mjs', import.meta.url));

// ------------------------------------------------------------ API falsa
function criarApiFalsa() {
  const sensores = new Map([
    ['CLT-8472-A', { level: 0, condominiumName: 'Residencial Aurora', barrelCode: 'BRL-8472' }],
    ['CLT-1264-B', { level: 62, condominiumName: 'Condomínio Bosque', barrelCode: 'BRL-1264' }],
  ]);
  const estado = { recebidas: [], proximoId: 12, abertas: new Map(), aguardandoVazio: new Set(), coletas: new Map() };

  const visao = (id) => {
    const s = sensores.get(id);
    const aberta = estado.abertas.get(id);
    return {
      sensorId: id,
      level: s.level,
      threshold: 80,
      condominiumName: s.condominiumName,
      barrelCode: s.barrelCode,
      companyName: 'EcoColeta Ambiental',
      online: true,
      lastCollectionAt: estado.coletas.get(id) ?? null,
      openRequest: aberta ? { id: aberta, status: 'PENDING', requestedAt: new Date().toISOString() } : null,
    };
  };

  const servidor = http.createServer((req, res) => {
    let texto = '';
    req.on('data', (p) => (texto += p));
    req.on('end', () => {
      const responder = (status, corpo) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(corpo));
      };
      const status = req.url.match(/^\/api\/sensor\/([^/]+)\/status$/);
      if (req.method === 'GET' && status) {
        const id = decodeURIComponent(status[1]);
        if (!sensores.has(id)) return responder(404, { statusCode: 404, message: `Sensor ${id} não encontrado` });
        return responder(200, { error: false, data: visao(id), message: 'Estado do sensor' });
      }
      if (req.method === 'POST' && req.url === '/api/sensor-alert') {
        const corpo = JSON.parse(texto || '{}');
        estado.recebidas.push({ corpo, contentType: req.headers['content-type'] });
        const chaves = Object.keys(corpo).sort().join(',');
        if (!['dataHora,percentual,sensorId', 'percentual,sensorId'].includes(chaves)) {
          return responder(400, { statusCode: 400, message: ['campos fora do contrato'] });
        }
        const id = corpo.sensorId;
        if (!sensores.has(id)) return responder(404, { statusCode: 404, message: `Sensor ${id} não encontrado` });
        const p = corpo.percentual;
        sensores.get(id).level = p;
        let reason;
        let triggered = false;
        if (p < 80) {
          reason = 'BELOW_THRESHOLD';
          estado.aguardandoVazio.delete(id);
        } else if (estado.abertas.has(id)) reason = 'REQUEST_ALREADY_OPEN';
        else if (estado.aguardandoVazio.has(id)) reason = 'AWAITING_EMPTY_READING';
        else {
          estado.abertas.set(id, estado.proximoId++);
          reason = 'THRESHOLD_REACHED';
          triggered = true;
        }
        const aberta = estado.abertas.get(id);
        return responder(201, {
          error: false,
          statusCode: 201,
          message: triggered ? `Leitura registrada. Solicitação de coleta #${aberta} criada.` : 'Leitura registrada.',
          data: {
            reading: { sensorId: id, percentual: p, level: p, dataHora: corpo.dataHora ?? null },
            sensor: visao(id),
            collection: { triggered, reason, request: aberta ? { id: aberta, status: 'PENDING' } : null },
          },
        });
      }
      responder(404, { message: 'rota não encontrada' });
    });
  });

  return {
    estado,
    sensores,
    concluirColeta(id) {
      estado.abertas.delete(id);
      estado.aguardandoVazio.add(id);
      estado.coletas.set(id, new Date().toISOString());
      sensores.get(id).level = 0;
    },
    async abrir() {
      await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
      return `http://127.0.0.1:${servidor.address().port}/api`;
    },
    fechar: () => new Promise((r) => servidor.close(r)),
  };
}

// --------------------------------------------- controller com relógio falso
function montar({ percentual = 10, ok = true } = {}) {
  let agora = 0;
  const enviados = [];
  const barril = new BarrilSimulado(90, percentual);
  const config = new SensorConfig({ sensorId: 'CLT-8472-A', apiUrl: 'http://api.teste/api/sensor-alert' });
  const router = {
    falhar: !ok,
    ultimaResposta: null,
    async enviarAlerta(payload) {
      enviados.push({ ms: agora, ...payload.toJSON() });
      this.ultimaResposta = this.falhar ? { status: 0, erro: 'conexão recusada' } : { status: 201, corpo: {} };
      return !this.falhar;
    },
  };
  const motivos = [];
  const controller = new SensorController(config, {
    sensor: new UltrasonicSensor(barril, { ruidoCm: 0 }),
    router,
    relogio: () => agora,
    aoRegistrar: (e) => e.tipo === 'envio' && motivos.push(e.motivo),
  });
  const rodar = async (ms) => {
    const fim = agora + ms;
    while (agora < fim) {
      await controller.monitorarBarril();
      agora += 10;
    }
  };
  return { barril, controller, router, enviados, motivos, rodar, agora: () => agora };
}

// ---------------------------------------------------------------- testes
test('FillLevelCalculator converte distância em percentual como o firmware', () => {
  const c = new FillLevelCalculator();
  assert.equal(c.calcularPercentual(90, 90), 0);
  assert.equal(c.calcularPercentual(81, 90), 10);
  assert.equal(c.calcularPercentual(45, 90), 50);
  assert.equal(c.calcularPercentual(18, 90), 80);
  assert.equal(c.calcularPercentual(12.6, 90), 86);
  assert.equal(c.calcularPercentual(2, 90), 98);
  assert.equal(c.calcularPercentual(400, 90), 0);
  assert.equal(c.calcularPercentual(10, 0), 0);
  assert.equal(c.atingiuLimite(80, 80), true);
  assert.equal(c.atingiuLimite(79, 80), false);
});

test('HC-SR04 simulado mede a distância até o óleo (mínimo de 2 cm)', () => {
  const barril = new BarrilSimulado(90, 85);
  const sensor = new UltrasonicSensor(barril, { ruidoCm: 0 });
  assert.ok(Math.abs(sensor.medirDistanciaCm() - 13.5) < 1e-9);
  barril.definirPercentual(100);
  assert.equal(sensor.medirDistanciaCm(), 2);
  barril.definirPercentual(250);
  assert.equal(barril.percentual, 100);
});

test('AlertPayload segue o contrato e dataHora vem com fuso', () => {
  assert.deepEqual(new AlertPayload({ sensorId: 'CLT-8472-A', percentual: 86, dataHora: 'x' }).toJSON(), {
    sensorId: 'CLT-8472-A',
    percentual: 86,
    dataHora: 'x',
  });
  assert.deepEqual(new AlertPayload({ sensorId: 'CLT-8472-A', percentual: 86 }).toJSON(), {
    sensorId: 'CLT-8472-A',
    percentual: 86,
  });
  assert.match(dataHoraLocal(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
});

test('normalizarApi aceita base, rota completa ou só o host', () => {
  assert.equal(normalizarApi('http://localhost:3000/api'), 'http://localhost:3000/api');
  assert.equal(normalizarApi('http://localhost:3000/api/'), 'http://localhost:3000/api');
  assert.equal(normalizarApi('https://x.onrender.com/api/sensor-alert'), 'https://x.onrender.com/api');
  assert.equal(normalizarApi('https://x.onrender.com'), 'https://x.onrender.com/api');
  assert.throws(() => normalizarApi('localhost:3000'));
});

test('política: primeira leitura, periódico a cada 15 s', async () => {
  const t = montar();
  await t.rodar(61000);
  assert.deepEqual(t.enviados.map((e) => e.ms), [0, 15000, 30000, 45000, 60000]);
  assert.deepEqual(t.motivos, ['primeira leitura', 'periódico', 'periódico', 'periódico', 'periódico']);
});

test('política: alerta na hora, sem repetir enquanto continua cheio', async () => {
  const t = montar();
  await t.rodar(5000);
  t.barril.definirPercentual(86);
  const mudou = t.agora();
  await t.rodar(1500);
  assert.equal(t.enviados.length, 2);
  assert.equal(t.enviados[1].percentual, 86);
  assert.ok(t.enviados[1].ms - mudou <= 1000);
  assert.equal(t.motivos[1], 'alerta - atingiu o limite');
  await t.rodar(40000);
  assert.equal(t.motivos.filter((m) => m.startsWith('alerta')).length, 1);
});

test('política: histerese de 10 pontos para um novo alerta', async () => {
  const t = montar();
  for (const p of [10, 86, 75, 86, 60, 86]) {
    t.barril.definirPercentual(p);
    await t.rodar(4000);
  }
  assert.deepEqual(t.enviados.map((e) => e.percentual), [10, 86, 75, 86, 60, 86]);
  assert.equal(t.motivos.filter((m) => m === 'alerta - atingiu o limite').length, 2);
});

test('política: variação de 5 pontos envia antes; 2 pontos espera', async () => {
  const t = montar();
  await t.rodar(4000);
  t.barril.definirPercentual(40);
  await t.rodar(1500);
  assert.equal(t.enviados.length, 2);
  assert.equal(t.motivos[1], 'variação de nível');
  t.barril.definirPercentual(42);
  await t.rodar(5000);
  assert.equal(t.enviados.length, 2);
});

test('política: falha guarda o alerta e tenta de novo após 5 s', async () => {
  const t = montar();
  await t.rodar(2000);
  t.router.falhar = true;
  t.barril.definirPercentual(86);
  await t.rodar(3000);
  assert.equal(t.enviados.length, 2);
  t.router.falhar = false;
  await t.rodar(7000);
  assert.equal(t.enviados.length, 3);
  assert.equal(t.motivos[2], 'alerta - nova tentativa');
});

test('botão "Enviar agora" envia na hora', async () => {
  const t = montar();
  await t.rodar(4000);
  t.controller.solicitarEnvioManual();
  await t.rodar(50);
  assert.equal(t.enviados.length, 2);
  assert.equal(t.motivos[1], 'botão (envio manual)');
});

test('RouterClient faz o POST real (JSON) e entende a resposta da API', async () => {
  const api = criarApiFalsa();
  const base = await api.abrir();
  try {
    const router = new RouterClient(new SensorConfig({ sensorId: 'CLT-8472-A', apiUrl: `${base}/sensor-alert` }));
    const ok = await router.enviarAlerta(new AlertPayload({ sensorId: 'CLT-8472-A', percentual: 86, dataHora: dataHoraLocal() }));
    assert.equal(ok, true);
    assert.equal(api.estado.recebidas[0].contentType, 'application/json');
    assert.equal(router.ultimaResposta.status, 201);
    assert.equal(router.ultimaResposta.corpo.data.collection.reason, 'THRESHOLD_REACHED');

    const desconhecido = await router.enviarAlerta(new AlertPayload({ sensorId: 'NAO-EXISTE', percentual: 10 }));
    assert.equal(desconhecido, false);
    assert.equal(router.ultimaResposta.status, 404);
  } finally {
    await api.fechar();
  }
  const fora = new RouterClient(new SensorConfig({ sensorId: 'X', apiUrl: 'http://127.0.0.1:9/api/sensor-alert' }));
  assert.equal(await fora.enviarAlerta(new AlertPayload({ sensorId: 'X', percentual: 1 })), false);
  assert.equal(fora.ultimaResposta.status, 0);
});

test('linha de comando --uma-vez envia a leitura e mostra a decisão da API', async () => {
  const api = criarApiFalsa();
  const base = await api.abrir();
  try {
    const { codigo, saida } = await new Promise((resolve) => {
      const filho = spawn(process.execPath, [SCRIPT, '--api', base, '--uma-vez', '--percentual', '85'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let saida = '';
      filho.stdout.on('data', (p) => (saida += p));
      filho.stderr.on('data', (p) => (saida += p));
      filho.on('close', (codigo) => resolve({ codigo, saida }));
    });
    assert.equal(codigo, 0, saida);
    assert.match(saida, /CLT-8472-A: 85% -> HTTP 201 Leitura registrada\. Solicitação de coleta #12 criada\. \[THRESHOLD_REACHED/);
    assert.equal(api.estado.recebidas[0].corpo.percentual, 85);
    assert.match(api.estado.recebidas[0].corpo.dataHora, /[+-]\d{2}:\d{2}$/);
  } finally {
    await api.fechar();
  }
});

test('painel: carrega o nível da API, aplica ações e esvazia quando a coleta é concluída', async () => {
  const api = criarApiFalsa();
  const base = await api.abrir();
  const { parar, servidor } = await iniciar({
    apiBase: base,
    sensores: ['CLT-1264-B'],
    porta: 0,
    intervaloEnvioMs: 15000,
    ruidoCm: 0,
    saida: () => {},
    pausaMs: 20,
  });
  const painel = `http://127.0.0.1:${servidor.address().port}`;
  const esperar = async (condicao, ms = 4000) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      if (await condicao()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  };
  try {
    const html = await (await fetch(painel)).text();
    assert.match(html, /Coillect · Sensor virtual/);

    let estado = await (await fetch(`${painel}/estado`)).json();
    assert.equal(estado.sensores[0].barril.percentualReal, 62, 'começa no nível que a API já tinha');
    assert.ok(await esperar(() => api.estado.recebidas.length >= 1), 'primeira leitura enviada');
    assert.equal(api.estado.recebidas[0].corpo.percentual, 62);

    await fetch(`${painel}/acao`, { method: 'POST', body: JSON.stringify({ sensorId: 'CLT-1264-B', acao: 'nivel', valor: 88 }) });
    assert.ok(await esperar(() => api.estado.abertas.has('CLT-1264-B')), 'alerta de 88% abriu a solicitação');
    estado = await (await fetch(`${painel}/estado`)).json();
    assert.equal(estado.sensores[0].ultimoEnvio.motivoApi, 'THRESHOLD_REACHED');

    api.concluirColeta('CLT-1264-B');
    assert.ok(
      await esperar(async () => (await (await fetch(`${painel}/estado`)).json()).sensores[0].barril.percentualReal === 0, 8000),
      'barril simulado esvaziado após a coleta',
    );
    assert.ok(await esperar(() => api.sensores.get('CLT-1264-B').level === 0 && api.estado.recebidas.at(-1).corpo.percentual === 0, 8000));

    const ruim = await fetch(`${painel}/acao`, { method: 'POST', body: JSON.stringify({ sensorId: 'OUTRO', acao: 'nivel', valor: 1 }) });
    assert.equal(ruim.status, 404);
  } finally {
    await parar();
    await api.fechar();
  }
});
