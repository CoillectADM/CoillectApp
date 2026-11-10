#!/usr/bin/env node
/**
 * Reenvia para a API REAL as requisições que o FIRMWARE gerou no teste no PC
 * (firmware_testes --capturar), e confere o efeito no sistema inteiro:
 * solicitação de coleta do barril para a empresa, aviso da empresa, cópia para
 * o síndico e, depois da coleta, a espera pela leitura do barril vazio.
 *
 * Uso:  node sensor-esp32/testes/reproduzir-na-api.mjs <URL_DA_API> <arquivo.jsonl> --reset
 *       ex.: node sensor-esp32/testes/reproduzir-na-api.mjs http://localhost:8080/api /tmp/roteiro.jsonl --reset
 *
 * --reset é obrigatório: o roteiro REINICIA os dados de demonstração.
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const [base, arquivo] = args.filter((a) => !a.startsWith('--'));
const senha = process.env.DEMO_PASSWORD || 'Coillect@2025';

if (!base || !arquivo || !args.includes('--reset')) {
  console.error('Uso: node reproduzir-na-api.mjs <URL_DA_API> <arquivo.jsonl> --reset');
  process.exit(2);
}
const api = base.replace(/\/+$/, '');

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

async function chamar(metodo, caminho, { token, corpo, aceitos = [200, 201] } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const resposta = await fetch(`${api}/${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(90_000),
  });
  const texto = await resposta.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    json = texto;
  }
  if (!aceitos.includes(resposta.status)) {
    console.error(`✗ ${metodo} /${caminho} -> HTTP ${resposta.status}`);
    console.error(texto.slice(0, 2000));
    process.exit(1);
  }
  return json;
}

const roteiro = readFileSync(arquivo, 'utf8')
  .split('\n')
  .filter((linha) => linha.trim())
  .map((linha) => JSON.parse(linha).corpo);
confere(roteiro.length >= 4, `roteiro do firmware lido (${roteiro.length} requisições)`, roteiro);
const sensorId = roteiro[0].sensorId;

await chamar('POST', 'admin/demo/reset');
const respostas = [];
for (const corpo of roteiro) {
  const r = await chamar('POST', 'sensor-alert', { corpo, aceitos: [201] });
  respostas.push(r.data);
  console.log(`  ${corpo.percentual}% -> ${r.message} [${r.data.collection.reason}]`);
}
confere(true, 'API aceitou todas as requisições do firmware (HTTP 201, contrato idêntico)');

const criadas = respostas.filter((d) => d.collection.triggered);
confere(criadas.length === 1, 'o alerta do firmware criou UMA solicitação de coleta', respostas.map((d) => d.collection));
const solicitacao = criadas[0].collection.request;
confere(
  criadas[0].collection.reason === 'THRESHOLD_REACHED' && solicitacao.status === 'PENDING' && solicitacao.origin === 'SENSOR',
  `solicitação #${solicitacao.id} PENDING, origem SENSOR, barril ${solicitacao.barrel?.code}`,
  solicitacao,
);
confere(
  respostas.some((d) => d.collection.reason === 'REQUEST_ALREADY_OPEN'),
  'leituras seguintes no limite não duplicam a solicitação',
);
confere(respostas.at(-1).reading.percentual === 0, 'última leitura do roteiro (barril esvaziado) registrada como 0%');
confere(
  typeof respostas[0].reading.dataHora === 'string' && /[+-]\d{2}:\d{2}$/.test(respostas[0].reading.dataHora),
  `dataHora do firmware guardada como veio (${respostas[0].reading.dataHora})`,
);

const empresa = await chamar('POST', 'auth/company/login', { corpo: { email: 'empresa@coillect.com', password: senha } });
const sindico = await chamar('POST', 'auth/login', { corpo: { email: 'sindico@coillect.com', password: senha } });

const ativas = await chamar('GET', 'collection-request/company/active', { token: empresa.access_token });
confere(
  ativas.data.some((s) => s.id === solicitacao.id && s.barrel?.code === solicitacao.barrel?.code),
  'a empresa recebeu a solicitação do barril (app-mobile-empresa)',
  ativas.data,
);
const avisos = await chamar('GET', 'notifications/company', { token: empresa.access_token });
confere(
  avisos.data.some((n) => n.requestId === solicitacao.id && n.title === 'Nova solicitação de coleta'),
  'a empresa recebeu o aviso "Nova solicitação de coleta"',
  avisos.data,
);
const notificacoes = await chamar('GET', 'notifications/mine', { token: sindico.access_token });
confere(
  notificacoes.data.some((n) => n.requestId === solicitacao.id && n.type === 'COLLECTION_REQUESTED'),
  'o síndico recebeu só a notificação da mesma solicitação (app-mobile-sindico)',
  notificacoes.data,
);

await chamar('POST', 'collection-request/company/schedule', { token: empresa.access_token, corpo: { sensorId } });
await chamar('POST', `collection-request/${solicitacao.id}/company-complete`, { token: empresa.access_token, corpo: {} });
const alerta = roteiro.find((c) => c.percentual >= 80);
const cheio = await chamar('POST', 'sensor-alert', { corpo: alerta, aceitos: [201] });
confere(
  cheio.data.collection.reason === 'AWAITING_EMPTY_READING' && !cheio.data.collection.triggered,
  'coleta concluída e sensor ainda lendo o barril cheio: nenhuma solicitação nova',
  cheio.data.collection,
);
const vazio = roteiro.at(-1);
await chamar('POST', 'sensor-alert', { corpo: vazio, aceitos: [201] });
const denovo = await chamar('POST', 'sensor-alert', { corpo: alerta, aceitos: [201] });
confere(
  denovo.data.collection.triggered && denovo.data.collection.request.id !== solicitacao.id,
  `barril lido vazio e cheio de novo: novo ciclo (solicitação #${denovo.data.collection.request?.id})`,
  denovo.data.collection,
);

await chamar('POST', 'admin/demo/reset');
console.log('\nRequisições do firmware validadas na API real. Dados de demonstração reiniciados.');
