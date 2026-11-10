#!/usr/bin/env node
/**
 * Coillect — sensor virtual no PC (alternativa ao ESP32 no Wokwi).
 *
 * Usa as MESMAS classes do diagrama do sensor e a MESMA política de envio do
 * firmware (sensor-esp32/coillect_sensor/coillect_sensor.ino), e envia a MESMA
 * requisição para a API:
 *   POST <api>/sensor-alert {"sensorId":"CLT-8472-A","percentual":86,"dataHora":"..."}
 *
 * Precisa só do Node 18+ (sem npm install). Exemplos:
 *   node sensor-esp32/simulador-pc/sensor-virtual.mjs --api http://localhost:3000/api
 *     -> abra http://localhost:4010 e arraste o nível do barril
 *   node sensor-esp32/simulador-pc/sensor-virtual.mjs --api https://SEU-SERVICO.onrender.com/api \
 *        --sensores CLT-8472-A,CLT-1264-B,CLT-9801-C
 *   node sensor-esp32/simulador-pc/sensor-virtual.mjs --api http://localhost:3000/api --uma-vez --percentual 85
 *     -> envia uma leitura por sensor e sai (código 0 = API respondeu 2xx)
 *
 * Opções: node sensor-virtual.mjs --ajuda
 */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

// ------------------------------------------------- política de envio
// Mesmos valores do firmware (coillect_sensor.ino).
export const POLITICA = Object.freeze({
  intervaloMedicaoMs: 1000,
  intervaloEnvioMs: 15000,
  variacaoEnvio: 5,
  histereseAlerta: 10,
  esperaEntreEnviosMs: 3000,
  esperaAposFalhaMs: 5000,
});

const MOTIVOS_API = {
  THRESHOLD_REACHED: 'limite atingido: solicitação de coleta criada para a empresa',
  BELOW_THRESHOLD: 'abaixo do limite: só registrou a leitura',
  REQUEST_ALREADY_OPEN: 'já existe solicitação aberta para este barril',
  AWAITING_EMPTY_READING: 'coleta recém-concluída: aguardando o sensor ler o barril vazio',
  NO_COMPANY_LINKED: 'condomínio sem empresa coletora vinculada',
  SENSOR_NOT_INSTALLED: 'sensor não está instalado em um barril',
};

export function descreverMotivoApi(motivo) {
  return MOTIVOS_API[motivo] ?? motivo ?? '';
}

// ------------------------------------------------------ SensorConfig
export class SensorConfig {
  constructor({ sensorId, apiUrl, roteadorId = 'rede do PC (simulador)', alturaBarrilCm = 90, limiteAlerta = 80 }) {
    this.sensorId = sensorId;
    this.apiUrl = apiUrl;
    this.roteadorId = roteadorId;
    this.alturaBarrilCm = alturaBarrilCm;
    this.limiteAlerta = limiteAlerta;
  }
}

// --------------------------------------------- mundo físico simulado
/** Quanto óleo há no barril. Não faz parte do diagrama: substitui o barril real. */
export class BarrilSimulado {
  constructor(alturaCm = 90, percentual = 0) {
    this.alturaCm = alturaCm;
    this.percentual = 0;
    this.definirPercentual(percentual);
  }

  definirPercentual(valor) {
    const numero = Number(valor);
    if (Number.isFinite(numero)) this.percentual = Math.min(100, Math.max(0, numero));
  }

  encher(passo) {
    this.definirPercentual(this.percentual + passo);
  }

  esvaziar() {
    this.percentual = 0;
  }

  distanciaAteOleoCm() {
    return this.alturaCm * (1 - this.percentual / 100);
  }
}

// -------------------------------------------------- UltrasonicSensor
/** HC-SR04 simulado: "mede" a distância até o óleo do BarrilSimulado (2 a 400 cm). */
export class UltrasonicSensor {
  constructor(barril, { pinoTrigger = 'virtual', pinoEcho = 'virtual', ruidoCm = 0.3, aleatorio = Math.random } = {}) {
    this.barril = barril;
    this.pinoTrigger = pinoTrigger;
    this.pinoEcho = pinoEcho;
    this.ruidoCm = ruidoCm;
    this.aleatorio = aleatorio;
  }

  medirDistanciaCm() {
    const ruido = (this.aleatorio() * 2 - 1) * this.ruidoCm;
    return Math.min(400, Math.max(2, this.barril.distanciaAteOleoCm() + ruido));
  }
}

// ----------------------------------------------- FillLevelCalculator
export class FillLevelCalculator {
  calcularPercentual(distanciaCm, alturaBarrilCm) {
    if (!(alturaBarrilCm > 0) || !(distanciaCm >= 0)) return 0;
    const percentual = ((alturaBarrilCm - distanciaCm) * 100) / alturaBarrilCm;
    return Math.floor(Math.min(100, Math.max(0, percentual)) + 0.5);
  }

  atingiuLimite(percentual, limite) {
    return percentual >= limite;
  }
}

// ------------------------------------------------------ AlertPayload
export class AlertPayload {
  constructor({ sensorId, percentual, dataHora = '' }) {
    this.sensorId = sensorId;
    this.percentual = percentual;
    this.dataHora = dataHora;
  }

  toJSON() {
    const json = { sensorId: this.sensorId, percentual: this.percentual };
    if (this.dataHora) json.dataHora = this.dataHora;
    return json;
  }
}

/** Data/hora local em ISO 8601 com fuso, ex.: 2026-11-10T14:32:05-03:00 (como o firmware). */
export function dataHoraLocal(data = new Date()) {
  const doisDigitos = (n) => String(n).padStart(2, '0');
  const fusoMin = -data.getTimezoneOffset();
  const sinal = fusoMin >= 0 ? '+' : '-';
  const absoluto = Math.abs(fusoMin);
  return (
    `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}` +
    `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}:${doisDigitos(data.getSeconds())}` +
    `${sinal}${doisDigitos(Math.floor(absoluto / 60))}:${doisDigitos(absoluto % 60)}`
  );
}

function descreverErro(erro) {
  if (erro?.name === 'TimeoutError' || erro?.name === 'AbortError') return 'tempo esgotado';
  const codigo = erro?.cause?.code;
  if (codigo === 'ECONNREFUSED') return 'conexão recusada (a API está rodando nesse endereço?)';
  if (codigo === 'ENOTFOUND') return 'endereço não encontrado (confira a URL da API)';
  return codigo ?? erro?.message ?? String(erro);
}

// ------------------------------------------------------ RouterClient
/** Envia o AlertPayload pela rede (no PC, a rede do próprio computador). */
export class RouterClient {
  constructor(config, { fetch: fetchImpl = globalThis.fetch, timeoutMs = 70000 } = {}) {
    this.config = config;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs; // a cloud gratuita pode levar ~1 min para "acordar"
    this.ultimaResposta = null;
  }

  async enviarAlerta(payload) {
    const inicio = Date.now();
    try {
      const resposta = await this.fetch(this.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const texto = await resposta.text();
      let corpo = null;
      try {
        corpo = JSON.parse(texto);
      } catch {
        corpo = null;
      }
      this.ultimaResposta = { status: resposta.status, ms: Date.now() - inicio, corpo, texto: texto.slice(0, 300) };
      return resposta.ok;
    } catch (erro) {
      this.ultimaResposta = { status: 0, ms: Date.now() - inicio, erro: descreverErro(erro) };
      return false;
    }
  }
}

// -------------------------------------------------- SensorController
export class SensorController {
  constructor(config, { sensor, calculator = new FillLevelCalculator(), router, relogio = Date.now, politica = POLITICA, aoRegistrar = () => {} }) {
    this.config = config;
    this.sensor = sensor;
    this.calculator = calculator;
    this.router = router;
    this.relogio = relogio;
    this.politica = { ...POLITICA, ...politica };
    this.aoRegistrar = aoRegistrar;

    this.jaMediu = false;
    this.jaTentou = false;
    this.jaEnviou = false;
    this.ultimaMedicaoMs = 0;
    this.ultimoEnvioOkMs = 0;
    this.proximoEnvioPermitidoMs = 0;
    this.ultimoPercentualEnviado = -1;
    this.alertaArmado = true;
    this.alertaPendente = false;
    this.alertaNovo = false;
    this.envioManual = false;

    this.distanciaCm = null;
    this.percentual = null;
    this.noLimite = false;
  }

  /** Equivale ao botão "Enviar agora" do circuito no Wokwi. */
  solicitarEnvioManual() {
    this.envioManual = true;
  }

  /** Um ciclo: mede, decide e (se for o caso) envia. Devolve o resultado do envio ou null. */
  async monitorarBarril() {
    const agora = this.relogio();
    if (this.jaMediu && !this.envioManual && agora - this.ultimaMedicaoMs < this.politica.intervaloMedicaoMs) return null;
    this.ultimaMedicaoMs = agora;
    this.jaMediu = true;

    const distanciaCm = this.sensor.medirDistanciaCm();
    if (!(distanciaCm >= 0)) return null;
    const percentual = this.calculator.calcularPercentual(distanciaCm, this.config.alturaBarrilCm);
    const noLimite = this.calculator.atingiuLimite(percentual, this.config.limiteAlerta);
    this.distanciaCm = distanciaCm;
    this.percentual = percentual;
    this.noLimite = noLimite;

    // Alerta só na subida; rearma depois de cair `histereseAlerta` pontos abaixo do limite.
    if (noLimite && this.alertaArmado) {
      this.alertaArmado = false;
      this.alertaPendente = true;
      this.alertaNovo = true;
    } else if (!noLimite && percentual <= this.config.limiteAlerta - this.politica.histereseAlerta) {
      this.alertaArmado = true;
    }

    const motivo = this.escolherMotivo(percentual, agora);
    if (!motivo) return null;

    const payload = new AlertPayload({ sensorId: this.config.sensorId, percentual, dataHora: dataHoraLocal() });
    this.aoRegistrar({ tipo: 'envio', motivo, payload: payload.toJSON() });
    const ok = await this.router.enviarAlerta(payload);
    const depois = this.relogio();
    this.jaTentou = true;
    this.alertaNovo = false;
    this.envioManual = false;
    if (ok) {
      this.jaEnviou = true;
      this.ultimoEnvioOkMs = agora;
      this.ultimoPercentualEnviado = percentual;
      this.alertaPendente = false;
      this.proximoEnvioPermitidoMs = depois + this.politica.esperaEntreEnviosMs;
    } else {
      this.proximoEnvioPermitidoMs = depois + this.politica.esperaAposFalhaMs;
    }
    const resultado = { motivo, ok, percentual, payload: payload.toJSON(), resposta: this.router.ultimaResposta };
    this.aoRegistrar({ tipo: 'resposta', ...resultado });
    return resultado;
  }

  // Prioridade: alerta novo > botão > (respeitando a espera) alerta pendente >
  // primeira leitura > periódico > variação de nível.
  escolherMotivo(percentual, agora) {
    if (this.alertaNovo) return 'alerta - atingiu o limite';
    if (this.envioManual) return 'botão (envio manual)';
    if (this.jaTentou && agora < this.proximoEnvioPermitidoMs) return null;
    if (this.alertaPendente) return 'alerta - nova tentativa';
    if (!this.jaEnviou) return 'primeira leitura';
    if (agora - this.ultimoEnvioOkMs >= this.politica.intervaloEnvioMs) return 'periódico';
    if (this.politica.variacaoEnvio > 0 && Math.abs(percentual - this.ultimoPercentualEnviado) >= this.politica.variacaoEnvio) {
      return 'variação de nível';
    }
    return null;
  }
}

// -------------------------------------- simulação (barril + controller)
/** Junta o barril simulado, o sensor e o controller de um sensorId, e guarda o histórico. */
export class SimulacaoSensor {
  constructor({
    sensorId,
    apiBase,
    alturaBarrilCm = 90,
    limiteAlerta = 80,
    intervaloEnvioMs = POLITICA.intervaloEnvioMs,
    percentualInicial = 0,
    ruidoCm = 0.3,
    fetch: fetchImpl = globalThis.fetch,
    relogio = Date.now,
    esvaziarAoConcluir = true,
    encherPasso = 5,
    encherIntervaloMs = 3000,
    saida = console.log,
  }) {
    this.sensorId = sensorId;
    this.apiBase = apiBase;
    this.fetch = fetchImpl;
    this.relogio = relogio;
    this.saida = saida;
    this.esvaziarAoConcluir = esvaziarAoConcluir;
    this.encherSozinho = false;
    this.encherPasso = encherPasso;
    this.encherIntervaloMs = encherIntervaloMs;
    this.ultimoEnchimentoMs = 0;
    this.ultimoStatusMs = 0;
    this.statusApi = null;
    this.erroStatus = null;
    this.ultimaColeta = undefined; // undefined = ainda não sabe; null = nunca houve coleta
    this.ultimoEnvio = null;
    this.historico = [];

    this.barril = new BarrilSimulado(alturaBarrilCm, percentualInicial);
    this.config = new SensorConfig({ sensorId, apiUrl: `${apiBase}/sensor-alert`, alturaBarrilCm, limiteAlerta });
    this.router = new RouterClient(this.config, { fetch: fetchImpl });
    this.controller = new SensorController(this.config, {
      sensor: new UltrasonicSensor(this.barril, { ruidoCm }),
      router: this.router,
      relogio,
      politica: { intervaloEnvioMs },
      aoRegistrar: (evento) => this.aoEnviar(evento),
    });
  }

  registrar(texto) {
    const hora = new Date().toLocaleTimeString('pt-BR');
    this.historico.unshift({ hora, texto });
    this.historico.length = Math.min(this.historico.length, 40);
    this.saida(`[${hora}] ${this.sensorId}  ${texto}`);
  }

  aoEnviar(evento) {
    if (evento.tipo !== 'resposta') return;
    const { motivo, percentual, resposta } = evento;
    let texto = `${percentual}% (${motivo}) -> `;
    if (!resposta || resposta.status === 0) {
      texto += `sem resposta: ${resposta?.erro ?? 'erro'}`;
    } else {
      const corpo = resposta.corpo ?? {};
      const mensagem = Array.isArray(corpo.message) ? corpo.message.join('; ') : corpo.message ?? resposta.texto;
      const motivoApi = corpo.data?.collection?.reason;
      texto += `HTTP ${resposta.status} (${resposta.ms} ms) ${mensagem ?? ''}`;
      if (motivoApi) texto += ` [${motivoApi}]`;
      if (resposta.status === 404) texto += ' -> cadastre o sensor no admin ou confira --sensores';
      if (corpo.data?.sensor) this.aplicarStatus(corpo.data.sensor);
    }
    this.ultimoEnvio = {
      hora: new Date().toLocaleTimeString('pt-BR'),
      percentual,
      motivo,
      status: resposta?.status ?? 0,
      ms: resposta?.ms ?? null,
      mensagem: resposta?.corpo?.message ?? resposta?.erro ?? null,
      motivoApi: resposta?.corpo?.data?.collection?.reason ?? null,
      decisao: descreverMotivoApi(resposta?.corpo?.data?.collection?.reason),
    };
    this.registrar(texto);
  }

  /** Atualiza o que a API sabe do sensor e detecta coleta concluída pela empresa. */
  aplicarStatus(sensor) {
    this.statusApi = sensor;
    const coleta = sensor.lastCollectionAt ?? null;
    if (this.ultimaColeta !== undefined && coleta && coleta !== this.ultimaColeta) {
      this.registrar(`coleta concluída pela empresa (${new Date(coleta).toLocaleString('pt-BR')})`);
      if (this.esvaziarAoConcluir && this.barril.percentual > 0) {
        this.barril.esvaziar();
        this.encherSozinho = false;
        this.registrar('barril simulado esvaziado (o coletor levou o óleo)');
      }
    }
    this.ultimaColeta = coleta;
  }

  async atualizarStatus() {
    this.ultimoStatusMs = this.relogio();
    try {
      const resposta = await this.fetch(`${this.apiBase}/sensor/${encodeURIComponent(this.sensorId)}/status`, {
        signal: AbortSignal.timeout(70000),
      });
      if (resposta.status === 404) {
        this.erroStatus = 'sensorId não cadastrado na API';
        return null;
      }
      const corpo = await resposta.json();
      if (!resposta.ok || !corpo?.data) {
        this.erroStatus = `HTTP ${resposta.status}`;
        return null;
      }
      this.erroStatus = null;
      this.aplicarStatus(corpo.data);
      return corpo.data;
    } catch (erro) {
      this.erroStatus = descreverErro(erro);
      return null;
    }
  }

  /** Começa no nível que a API já conhece (ex.: 62% do Condomínio Bosque). */
  async carregarNivelInicial() {
    const sensor = await this.atualizarStatus();
    if (sensor && Number.isFinite(sensor.level)) {
      this.barril.definirPercentual(sensor.level);
      const local = [sensor.condominiumName, sensor.barrelCode].filter(Boolean).join(' / ');
      this.registrar(`pronto: ${local || 'sensor cadastrado'}, nível inicial ${sensor.level}%`);
    } else {
      this.registrar(`atenção: ${this.erroStatus ?? 'API sem resposta'}; começando em ${this.barril.percentual}%`);
    }
  }

  async ciclo() {
    const agora = this.relogio();
    if (this.encherSozinho && agora - this.ultimoEnchimentoMs >= this.encherIntervaloMs) {
      this.ultimoEnchimentoMs = agora;
      this.barril.encher(this.encherPasso);
      if (this.barril.percentual >= 100) this.encherSozinho = false;
    }
    if (agora - this.ultimoStatusMs >= 5000) await this.atualizarStatus();
    return this.controller.monitorarBarril();
  }

  acao({ acao, valor }) {
    switch (acao) {
      case 'nivel':
        this.barril.definirPercentual(valor);
        break;
      case 'alerta':
        this.barril.definirPercentual(Math.min(100, this.config.limiteAlerta + 5));
        break;
      case 'esvaziar':
        this.barril.esvaziar();
        this.encherSozinho = false;
        break;
      case 'enviar':
        this.controller.solicitarEnvioManual();
        break;
      case 'auto':
        this.encherSozinho = Boolean(valor);
        this.ultimoEnchimentoMs = this.relogio();
        break;
      default:
        throw new Error(`ação desconhecida: ${acao}`);
    }
    if (acao !== 'enviar' && acao !== 'auto') this.registrar(`barril ajustado para ${Math.round(this.barril.percentual)}%`);
    return this.resumo();
  }

  resumo() {
    const c = this.controller;
    const api = this.statusApi;
    return {
      sensorId: this.sensorId,
      barril: {
        percentualReal: Math.round(this.barril.percentual),
        alturaCm: this.barril.alturaCm,
        encherSozinho: this.encherSozinho,
      },
      medicao: {
        distanciaCm: c.distanciaCm === null ? null : Math.round(c.distanciaCm * 10) / 10,
        percentual: c.percentual,
        limite: this.config.limiteAlerta,
        noLimite: c.noLimite,
      },
      api: api
        ? {
            condominio: api.condominiumName ?? null,
            bairro: api.condominiumNeighborhood ?? null,
            barril: api.barrelCode ?? null,
            empresa: api.companyName ?? null,
            nivel: api.level ?? null,
            online: api.online ?? null,
            solicitacaoAberta: api.openRequest ?? null,
            ultimaColeta: api.lastCollectionAt ?? null,
          }
        : null,
      erroApi: this.erroStatus,
      ultimoEnvio: this.ultimoEnvio,
      historico: this.historico.slice(0, 12),
    };
  }
}

// ------------------------------------------------------------- painel
function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (parte) => {
      dados += parte;
      if (dados.length > 10000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(dados ? JSON.parse(dados) : {});
      } catch (erro) {
        reject(erro);
      }
    });
    req.on('error', reject);
  });
}

function responderJson(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

export function criarServidorPainel({ simulacoes, apiBase }) {
  const porId = new Map(simulacoes.map((s) => [s.sensorId, s]));
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://painel');
      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(PAINEL_HTML);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/estado') {
        responderJson(res, 200, { api: apiBase, sensores: simulacoes.map((s) => s.resumo()) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/acao') {
        const corpo = await lerCorpo(req);
        const simulacao = porId.get(corpo.sensorId);
        if (!simulacao) {
          responderJson(res, 404, { erro: `sensor ${corpo.sensorId} não está neste simulador` });
          return;
        }
        responderJson(res, 200, simulacao.acao(corpo));
        return;
      }
      responderJson(res, 404, { erro: 'rota não encontrada' });
    } catch (erro) {
      responderJson(res, 400, { erro: erro.message });
    }
  });
}

/** Inicia os sensores (e o painel, se `porta` for informada). Devolve { simulacoes, servidor, parar }. */
export async function iniciar({
  apiBase,
  sensores,
  porta = null,
  host = '127.0.0.1',
  intervaloEnvioMs = POLITICA.intervaloEnvioMs,
  alturaBarrilCm = 90,
  limiteAlerta = 80,
  encherSozinho = false,
  ruidoCm = 0.3,
  fetch: fetchImpl = globalThis.fetch,
  saida = console.log,
  pausaMs = 200,
}) {
  const simulacoes = sensores.map(
    (sensorId) =>
      new SimulacaoSensor({ sensorId, apiBase, alturaBarrilCm, limiteAlerta, intervaloEnvioMs, ruidoCm, fetch: fetchImpl, saida }),
  );

  // O painel abre antes: se a API estiver "acordando" na cloud, já dá para ver o status.
  let servidor = null;
  if (porta !== null) {
    servidor = criarServidorPainel({ simulacoes, apiBase });
    await new Promise((resolve, reject) => {
      servidor.once('error', reject);
      servidor.listen(porta, host, resolve);
    });
  }

  // Só começa a enviar depois de saber o nível atual de cada sensor na API.
  await Promise.all(simulacoes.map((s) => s.carregarNivelInicial()));
  for (const s of simulacoes) s.encherSozinho = encherSozinho;

  let ativo = true;
  const lacos = simulacoes.map(async (simulacao) => {
    while (ativo) {
      try {
        await simulacao.ciclo();
      } catch (erro) {
        simulacao.registrar(`erro: ${erro.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, pausaMs));
    }
  });

  const parar = async () => {
    ativo = false;
    await Promise.all(lacos);
    if (servidor) await new Promise((resolve) => servidor.close(resolve));
  };
  return { simulacoes, servidor, parar };
}

/** Aceita ".../api", ".../api/sensor-alert" ou só o host; devolve a base ".../api". */
export function normalizarApi(url) {
  let base = String(url ?? '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) throw new Error(`URL da API inválida: "${url}" (use http:// ou https://)`);
  base = base.replace(/\/sensor-alert$/i, '');
  if (!/\/api(\/|$)/i.test(new URL(base).pathname)) base += '/api';
  return base;
}

const AJUDA = `Coillect - sensor virtual no PC (mesma requisição do ESP32)

Uso:
  node sensor-virtual.mjs --api <URL> [opções]

Opções:
  --api URL              Base da API (ex.: http://localhost:3000/api ou https://SEU-SERVICO.onrender.com/api)
                         Padrão: variável COILLECT_API_URL ou http://localhost:3000/api
  --sensores A,B,C       sensorId(s) cadastrados na API (padrão: CLT-8472-A)
  --porta 4010           Porta do painel no navegador (padrão: 4010)
  --intervalo 15         Envio periódico, em segundos (padrão: 15)
  --altura 90            Distância do sensor ao fundo do barril, em cm (padrão: 90)
  --limite 80            Limite de alerta, em % (padrão: 80)
  --encher-sozinho       Começa enchendo +5% a cada 3 s
  --sem-painel           Só terminal, sem painel (combine com --encher-sozinho)
  --uma-vez              Envia UMA leitura por sensor e sai (use com --percentual)
  --percentual 85        Nível da leitura do --uma-vez
  --ajuda                Mostra esta ajuda
`;

async function principal() {
  let opcoes;
  try {
    opcoes = parseArgs({
      options: {
        api: { type: 'string' },
        sensores: { type: 'string' },
        porta: { type: 'string' },
        intervalo: { type: 'string' },
        altura: { type: 'string' },
        limite: { type: 'string' },
        percentual: { type: 'string' },
        'encher-sozinho': { type: 'boolean' },
        'sem-painel': { type: 'boolean' },
        'uma-vez': { type: 'boolean' },
        ajuda: { type: 'boolean', short: 'h' },
      },
    }).values;
  } catch (erro) {
    console.error(`${erro.message}\n\n${AJUDA}`);
    process.exit(2);
  }
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }

  const apiBase = normalizarApi(opcoes.api ?? process.env.COILLECT_API_URL ?? 'http://localhost:3000/api');
  const sensores = (opcoes.sensores ?? 'CLT-8472-A').split(',').map((s) => s.trim()).filter(Boolean);
  const alturaBarrilCm = Number(opcoes.altura ?? 90);
  const limiteAlerta = Number(opcoes.limite ?? 80);
  const intervaloEnvioMs = Number(opcoes.intervalo ?? 15) * 1000;
  if (!(alturaBarrilCm > 0) || !(limiteAlerta > 0 && limiteAlerta <= 100) || !(intervaloEnvioMs >= 1000)) {
    console.error('Valores inválidos em --altura, --limite ou --intervalo.');
    process.exit(2);
  }

  if (opcoes['uma-vez']) {
    const percentual = Number(opcoes.percentual);
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
      console.error('Use --uma-vez junto com --percentual (0 a 100).');
      process.exit(2);
    }
    let falhas = 0;
    for (const sensorId of sensores) {
      const simulacao = new SimulacaoSensor({
        sensorId,
        apiBase,
        alturaBarrilCm,
        limiteAlerta,
        percentualInicial: percentual,
        ruidoCm: 0,
        saida: () => {},
      });
      const resultado = await simulacao.controller.monitorarBarril();
      const resposta = resultado?.resposta;
      const corpo = resposta?.corpo;
      const mensagem = Array.isArray(corpo?.message) ? corpo.message.join('; ') : corpo?.message;
      const motivo = corpo?.data?.collection?.reason;
      console.log(
        `${sensorId}: ${resultado?.percentual}% -> ` +
          (resposta?.status ? `HTTP ${resposta.status} ${mensagem ?? resposta.texto ?? ''}` : `sem resposta: ${resposta?.erro}`) +
          (motivo ? ` [${motivo}: ${descreverMotivoApi(motivo)}]` : ''),
      );
      if (!resultado?.ok) falhas++;
    }
    process.exit(falhas ? 1 : 0);
  }

  const semPainel = Boolean(opcoes['sem-painel']);
  const porta = semPainel ? null : Number(opcoes.porta ?? 4010);
  console.log(`Coillect - sensor virtual no PC\nAPI: ${apiBase}\nSensores: ${sensores.join(', ')}`);
  console.log(`Envio: a cada ${intervaloEnvioMs / 1000} s, na hora ao atingir ${limiteAlerta}% e ao variar 5 pontos\n`);
  const { parar } = await iniciar({
    apiBase,
    sensores,
    porta,
    intervaloEnvioMs,
    alturaBarrilCm,
    limiteAlerta,
    encherSozinho: Boolean(opcoes['encher-sozinho']),
  });
  if (porta !== null) console.log(`\nPainel: http://localhost:${porta}  (Ctrl+C para sair)\n`);

  const encerrar = async () => {
    console.log('\nEncerrando o sensor virtual...');
    await parar();
    process.exit(0);
  };
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);
}

// ------------------------------------------------------- página do painel
const PAINEL_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coillect · Sensor virtual</title>
<style>
  :root { --fundo:#F4F6F1; --card:#FFFFFF; --verde:#95AF4A; --laranja:#D69146; --alerta:#FFF8EE;
          --trilho:#E4E9E2; --escuro:#20221F; --borda:#A3AAA2; --texto:#2B2E29; --suave:#6B7068; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:var(--fundo); color:var(--texto); }
  header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 28px; background:var(--card); border-bottom:1px solid var(--trilho); }
  header h1 { margin:0; font-size:20px; }
  header .api { font-size:13px; color:var(--suave); word-break:break-all; }
  main { padding:24px 28px; display:grid; gap:20px; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }
  .card { background:var(--card); border-radius:16px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,.06); display:flex; flex-direction:column; gap:14px; }
  .topo { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
  .topo h2 { margin:0; font-size:18px; }
  .topo .sub { font-size:13px; color:var(--suave); margin-top:2px; }
  .selo { font-size:12px; padding:4px 10px; border-radius:999px; background:var(--trilho); white-space:nowrap; }
  .selo.on { background:#E7EEDC; color:#4F6420; }
  .corpo { display:flex; gap:20px; align-items:center; }
  .barril { position:relative; width:96px; height:150px; border:3px solid var(--borda); border-radius:14px 14px 18px 18px; overflow:hidden; background:#FAFBF8; flex:none; }
  .oleo { position:absolute; left:0; right:0; bottom:0; background:var(--verde); transition:height .4s, background .4s; }
  .oleo.alerta { background:var(--laranja); }
  .linha-limite { position:absolute; left:0; right:0; border-top:2px dashed var(--escuro); opacity:.35; }
  .numero { font-size:42px; font-weight:700; line-height:1; }
  .numero small { font-size:16px; font-weight:500; color:var(--suave); }
  .estado { font-size:14px; margin-top:6px; }
  .estado.alerta { color:var(--laranja); font-weight:600; }
  .medida { font-size:13px; color:var(--suave); margin-top:6px; }
  label.faixa { display:flex; flex-direction:column; gap:6px; font-size:13px; color:var(--suave); }
  input[type=range] { width:100%; accent-color: var(--verde); }
  .botoes { display:flex; flex-wrap:wrap; gap:8px; }
  button { border:0; border-radius:10px; padding:10px 14px; font-size:14px; cursor:pointer; background:var(--trilho); color:var(--texto); }
  button.principal { background:var(--escuro); color:#fff; }
  button.laranja { background:var(--laranja); color:#fff; }
  .auto { display:flex; align-items:center; gap:8px; font-size:14px; }
  .api-caixa { background:var(--fundo); border-radius:12px; padding:12px; font-size:13px; line-height:1.5; }
  .api-caixa.alerta { background:var(--alerta); border:1px solid #F1D9B8; }
  .historico { font-size:12px; color:var(--suave); max-height:150px; overflow:auto; margin:0; padding-left:18px; }
  .erro { color:#B3261E; font-size:13px; }
  footer { padding:0 28px 28px; font-size:12px; color:var(--suave); }
</style>
</head>
<body>
<header>
  <div><h1>Coillect · Sensor virtual</h1><div class="api" id="api"></div></div>
  <div class="selo" id="conexao">conectando…</div>
</header>
<main id="sensores"></main>
<footer>Mesmo envio do ESP32: POST /api/sensor-alert {"sensorId","percentual","dataHora"} — periódico, na hora ao atingir o limite e ao variar 5 pontos. A API decide a coleta.</footer>
<script>
const caixa = document.getElementById('sensores');
const arrastando = new Set();

function esc(texto) {
  return String(texto ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function el(tag, attrs = {}, filhos = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const f of [].concat(filhos)) e.append(f instanceof Node ? f : document.createTextNode(f));
  return e;
}

async function acao(sensorId, acao, valor) {
  await fetch('/acao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sensorId, acao, valor }) });
  atualizar();
}

function criarCartao(s) {
  const id = s.sensorId;
  const faixa = el('input', { type: 'range', min: '0', max: '100', step: '1', value: String(s.barril.percentualReal) });
  faixa.addEventListener('pointerdown', () => arrastando.add(id));
  faixa.addEventListener('input', () => { cartao.querySelector('[data-c=alvo]').textContent = faixa.value + '%'; });
  faixa.addEventListener('change', () => { arrastando.delete(id); acao(id, 'nivel', Number(faixa.value)); });
  const auto = el('input', { type: 'checkbox', onchange: (e) => acao(id, 'auto', e.target.checked) });
  const cartao = el('section', { class: 'card', id: 'c-' + id }, [
    el('div', { class: 'topo' }, [
      el('div', {}, [el('h2', {}, id), el('div', { class: 'sub', 'data-c': 'local' }, '')]),
      el('span', { class: 'selo', 'data-c': 'online' }, '—'),
    ]),
    el('div', { class: 'corpo' }, [
      el('div', { class: 'barril' }, [el('div', { class: 'oleo', 'data-c': 'oleo' }), el('div', { class: 'linha-limite', 'data-c': 'limite' })]),
      el('div', {}, [
        el('div', { class: 'numero', 'data-c': 'numero' }, '—'),
        el('div', { class: 'estado', 'data-c': 'estado' }, ''),
        el('div', { class: 'medida', 'data-c': 'medida' }, ''),
      ]),
    ]),
    el('label', { class: 'faixa' }, [el('span', {}, ['Óleo no barril (mundo físico): ', el('b', { 'data-c': 'alvo' }, '')]), faixa]),
    el('div', { class: 'botoes' }, [
      el('button', { class: 'principal', onclick: () => acao(id, 'enviar') }, 'Enviar leitura agora'),
      el('button', { class: 'laranja', onclick: () => acao(id, 'alerta') }, 'Simular alerta'),
      el('button', { onclick: () => acao(id, 'esvaziar') }, 'Esvaziar barril (coleta feita)'),
    ]),
    el('label', { class: 'auto' }, [auto, 'Encher sozinho (+5% a cada 3 s)']),
    el('div', { class: 'api-caixa', 'data-c': 'api' }, ''),
    el('ol', { class: 'historico', 'data-c': 'historico' }),
  ]);
  cartao._faixa = faixa;
  cartao._auto = auto;
  caixa.append(cartao);
  return cartao;
}

function render(estado) {
  document.getElementById('api').textContent = 'API: ' + estado.api;
  for (const s of estado.sensores) {
    const c = document.getElementById('c-' + s.sensorId) || criarCartao(s);
    const q = (n) => c.querySelector('[data-c=' + n + ']');
    const m = s.medicao;
    const pct = m.percentual ?? s.barril.percentualReal;
    q('oleo').style.height = pct + '%';
    q('oleo').classList.toggle('alerta', !!m.noLimite);
    q('limite').style.bottom = m.limite + '%';
    q('numero').innerHTML = (m.percentual ?? '—') + '<small>%</small>';
    q('estado').textContent = m.noLimite ? 'Limite atingido (' + m.limite + '%)' : 'Operação normal (limite ' + m.limite + '%)';
    q('estado').classList.toggle('alerta', !!m.noLimite);
    q('medida').textContent = m.distanciaCm === null ? '' : 'HC-SR04: ' + String(m.distanciaCm).replace('.', ',') + ' cm até o óleo';
    if (!arrastando.has(s.sensorId)) { c._faixa.value = s.barril.percentualReal; q('alvo').textContent = s.barril.percentualReal + '%'; }
    c._auto.checked = s.barril.encherSozinho;
    const a = s.api;
    q('local').textContent = a ? [a.condominio, a.bairro, a.barril].filter(Boolean).join(' · ') : '';
    q('online').textContent = a ? (a.online ? 'online na API' : 'offline na API') : 'sem status';
    q('online').className = 'selo' + (a && a.online ? ' on' : '');
    const linhas = [];
    if (s.erroApi) linhas.push('<span class="erro">API: ' + esc(s.erroApi) + '</span>');
    if (a) {
      const sol = a.solicitacaoAberta;
      linhas.push(sol ? '<b>Solicitação #' + esc(sol.id) + '</b> aberta: ' + esc(sol.status) + (a.empresa ? ' · ' + esc(a.empresa) : '') : 'Sem solicitação de coleta aberta');
      if (a.ultimaColeta) linhas.push('Última coleta: ' + esc(new Date(a.ultimaColeta).toLocaleString('pt-BR')));
    }
    const u = s.ultimoEnvio;
    if (u) {
      const mensagem = Array.isArray(u.mensagem) ? u.mensagem.join('; ') : u.mensagem;
      linhas.push('Último envio ' + esc(u.hora) + ': ' + esc(u.percentual) + '% (' + esc(u.motivo) + ') → ' + (u.status ? 'HTTP ' + esc(u.status) : 'sem resposta') + (mensagem ? ' · ' + esc(mensagem) : '') + (u.decisao ? '<br>Decisão da API: ' + esc(u.decisao) : ''));
    }
    q('api').innerHTML = linhas.join('<br>');
    q('api').classList.toggle('alerta', !!(a && a.solicitacaoAberta));
    q('historico').innerHTML = s.historico.map((h) => '<li>' + esc(h.hora) + ' — ' + esc(h.texto) + '</li>').join('');
  }
}

async function atualizar() {
  try {
    const r = await fetch('/estado');
    render(await r.json());
    document.getElementById('conexao').textContent = 'simulador ativo';
    document.getElementById('conexao').className = 'selo on';
  } catch {
    document.getElementById('conexao').textContent = 'simulador parado';
    document.getElementById('conexao').className = 'selo';
  }
}
atualizar();
setInterval(atualizar, 1000);
</script>
</body>
</html>`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((erro) => {
    console.error(erro.message ?? erro);
    process.exit(1);
  });
}
