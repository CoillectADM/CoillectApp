/**
 * Eventos de negócio em JSON, uma linha por evento, na saída padrão (stdout).
 *
 * Na nuvem a plataforma coleta o stdout (Azure App Service → Log Analytics,
 * tabela AppServiceConsoleLogs; Render → aba Logs). Como cada linha é um JSON,
 * dá para montar gráficos e dashboards com consultas KQL, por exemplo:
 *
 *   AppServiceConsoleLogs
 *   | where ResultDescription startswith '{"app":"coillect-api"'
 *   | extend e = parse_json(ResultDescription)
 *   | where e.evento == "leitura_sensor"
 *   | summarize nivel = max(toint(e.percentual)) by bin(TimeGenerated, 1m), sensor = tostring(e.sensorId)
 *   | render timechart
 *
 * Desligue com LOG_EVENTS=false. Nos testes (NODE_ENV=test) fica desligado.
 */
export type TelemetryEvent =
  | 'leitura_sensor'
  | 'solicitacao_criada'
  | 'solicitacao_status'
  | 'fila_mensagem_enviada'
  | 'fila_mensagem_processada'
  | 'fila_mensagem_erro'
  | 'fila_mensagem_descartada'
  | 'fila_indisponivel'
  | 'comprovante_gerado'
  | 'comprovante_erro'
  | 'ajuda_solicitada'
  | 'armazenamento_iniciado';

export function telemetryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = (env.LOG_EVENTS || '').trim().toLowerCase();
  if (['false', '0', 'no', 'off', 'nao', 'não'].includes(flag)) return false;
  if (['true', '1', 'yes', 'on', 'sim'].includes(flag)) return true;
  return env.NODE_ENV !== 'test';
}

export function formatEvent(
  evento: TelemetryEvent,
  dados: Record<string, unknown> = {},
  now: Date = new Date(),
): string {
  return JSON.stringify({ app: 'coillect-api', evento, ...dados, em: now.toISOString() });
}

export function logEvent(evento: TelemetryEvent, dados: Record<string, unknown> = {}): void {
  if (!telemetryEnabled()) return;
  process.stdout.write(`${formatEvent(evento, dados)}\n`);
}
