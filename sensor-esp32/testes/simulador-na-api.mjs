#!/usr/bin/env node
/**
 * Roda o SENSOR VIRTUAL DO PC contra a API REAL e confere o ciclo da demonstração:
 * linha de comando (--uma-vez), painel, alerta -> solicitação da empresa, coleta
 * concluída pela empresa -> simulador esvazia o barril -> API não reabre a coleta.
 *
 * Uso:  node sensor-esp32/testes/simulador-na-api.mjs <URL_DA_API> --reset
 * --reset é obrigatório: o roteiro REINICIA os dados de demonstração.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { iniciar, normalizarApi } from '../simulador-pc/sensor-virtual.mjs';

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith('--'));
if (!base || !args.includes('--reset')) {
  console.error('Uso: node simulador-na-api.mjs <URL_DA_API> --reset');
  process.exit(2);
}
const api = normalizarApi(base);
const senha = process.env.DEMO_PASSWORD || 'Coillect@2025';
const SIMULADOR = fileURLToPath(new URL('../simulador-pc/sensor-virtual.mjs', import.meta.url));

let passo = 0;
function confere(condicao, mensagem, detalhe) {
  passo += 1;
  if (!condicao) {
    console.error(`✗ ${passo}. ${mensagem}`);
    if (detalhe !== undefined) console.error(JSON.stringify(detalhe, null, 2).slice(0, 2000));
    process.exit(1);
  }
  console.log(`✓ ${passo}. ${mensagem}`);
}

async function chamar(metodo, caminho, { token, corpo } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const resposta = await fetch(`${api}/${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(90_000),
  });
  const json = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    console.error(`✗ ${metodo} /${caminho} -> HTTP ${resposta.status}`, JSON.stringify(json).slice(0, 1000));
    process.exit(1);
  }
  return json;
}

async function esperar(condicao, ms, intervalo = 250) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const valor = await condicao();
    if (valor) return valor;
    await new Promise((r) => setTimeout(r, intervalo));
  }
  return null;
}

const statusDo = async (sensorId) => (await chamar('GET', `sensor/${sensorId}/status`)).data;

await chamar('POST', 'admin/demo/reset');

// 1) Linha de comando: uma leitura e sai.
const umaVez = await new Promise((resolve) => {
  const filho = spawn(process.execPath, [SIMULADOR, '--api', api, '--sensores', 'CLT-9801-C', '--uma-vez', '--percentual', '90'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let saida = '';
  filho.stdout.on('data', (p) => (saida += p));
  filho.stderr.on('data', (p) => (saida += p));
  filho.on('close', (codigo) => resolve({ codigo, saida }));
});
console.log(`  ${umaVez.saida.trim()}`);
confere(umaVez.codigo === 0 && /Solicitação de coleta #\d+ criada/.test(umaVez.saida), '--uma-vez: leitura de 90% criou a solicitação', umaVez);

// 2) Painel + laço do sensor (como no PC durante a apresentação).
const log = [];
const { parar, servidor } = await iniciar({
  apiBase: api,
  sensores: ['CLT-1264-B'],
  porta: 0,
  intervaloEnvioMs: 15000,
  saida: (linha) => {
    log.push(linha);
    console.log(`  ${linha}`);
  },
});
const painel = `http://127.0.0.1:${servidor.address().port}`;
const estado = async () => (await (await fetch(`${painel}/estado`)).json()).sensores[0];
try {
  const inicial = await estado();
  confere(inicial.barril.percentualReal === 62, 'painel começa no nível que a API tinha (Condomínio Bosque, 62%)', inicial);
  confere(await esperar(async () => (await estado()).ultimoEnvio?.status === 201, 10000), 'primeira leitura do simulador aceita (HTTP 201)');

  await fetch(`${painel}/acao`, { method: 'POST', body: JSON.stringify({ sensorId: 'CLT-1264-B', acao: 'nivel', valor: 88 }) });
  const aberta = await esperar(async () => (await statusDo('CLT-1264-B')).openRequest, 10000);
  confere(aberta && aberta.status === 'PENDING', `painel em 88%: API abriu a solicitação #${aberta?.id}`, aberta);

  const empresa = await chamar('POST', 'auth/company/login', { corpo: { email: 'empresa@coillect.com', password: senha } });
  const avisos = await chamar('GET', 'notifications/company', { token: empresa.access_token });
  confere(
    avisos.data.some((n) => n.requestId === aberta.id && /Condomínio Bosque chegou a \d+% de capacidade/.test(n.message)),
    'empresa recebeu o aviso do Condomínio Bosque',
    avisos.data,
  );

  await chamar('POST', 'collection-request/company/schedule', { token: empresa.access_token, corpo: { sensorId: 'CLT-1264-B' } });
  await chamar('POST', `collection-request/${aberta.id}/company-complete`, { token: empresa.access_token, corpo: {} });
  confere(
    await esperar(async () => (await estado()).barril.percentualReal === 0, 12000),
    'empresa concluiu a coleta: o simulador percebeu e esvaziou o barril',
  );
  const depois = await esperar(async () => {
    const s = await statusDo('CLT-1264-B');
    return s.level === 0 && s.lastReadingAt && new Date(s.lastReadingAt) > new Date(s.lastCollectionAt) ? s : null;
  }, 12000);
  confere(depois && depois.openRequest === null, 'sensor leu o barril vazio e nenhuma solicitação nova foi aberta', depois);
} finally {
  await parar();
}

await chamar('POST', 'admin/demo/reset');
console.log('\nSensor virtual do PC validado na API real. Dados de demonstração reiniciados.');
