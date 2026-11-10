import { CollectionRequest } from './collection-request.entity';
import { DEFAULT_ALERT_THRESHOLD } from '../sensor/entities/barrel.entity';

/**
 * Comprovante de coleta: documento JSON gravado no Azure Blob Storage
 * (container "comprovantes-coleta") quando a empresa conclui a coleta.
 * É o "arquivo" do projeto: imutável, um por coleta, consultado pelos apps.
 */
export interface CollectionReceipt {
  tipo: 'comprovante-de-coleta';
  versao: 1;
  protocolo: string;
  solicitacaoId: number;
  origem: string;
  condominio: { nome: string; endereco: string | null; bairro: string | null } | null;
  sindico: { nome: string; email: string } | null;
  empresaColetora: { nome: string; cnpj: string | null } | null;
  barril: {
    codigo: string;
    capacidadeLitros: number | null;
    limiteAlertaPercentual: number;
  } | null;
  sensor: string | null;
  nivelNoAlertaPercentual: number | null;
  /** capacidade × nível no alerta (estimativa do óleo recolhido). */
  volumeEstimadoLitros: number | null;
  solicitadaEm: string | null;
  agendadaPara: string | null;
  concluidaEm: string | null;
  emitidoEm: string;
  armazenamento: { provedor: string; container: string; blob: string };
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function receiptProtocol(requestId: number): string {
  return `COL-${String(requestId).padStart(6, '0')}`;
}

/** Ex.: 2026/11/10/coleta-12-20261110T061500Z.json (pastas por data da conclusão, UTC). */
export function receiptBlobName(request: Pick<CollectionRequest, 'id' | 'completedAt'>): string {
  const completed = new Date(iso(request.completedAt) ?? Date.now());
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp =
    `${completed.getUTCFullYear()}${pad(completed.getUTCMonth() + 1)}${pad(completed.getUTCDate())}` +
    `T${pad(completed.getUTCHours())}${pad(completed.getUTCMinutes())}${pad(completed.getUTCSeconds())}Z`;
  return (
    `${completed.getUTCFullYear()}/${pad(completed.getUTCMonth() + 1)}/${pad(completed.getUTCDate())}` +
    `/coleta-${request.id}-${stamp}.json`
  );
}

export function buildReceipt(
  request: CollectionRequest,
  storage: { provider: string; container: string; name: string },
  now: Date = new Date(),
): CollectionReceipt {
  const sensor = request.sensor ?? null;
  const barrel = request.barrel ?? sensor?.barrel ?? null;
  const condominium = barrel?.condominium ?? null;
  const capacity = barrel?.capacityLiters ?? null;
  const level = request.levelAtRequest ?? null;
  return {
    tipo: 'comprovante-de-coleta',
    versao: 1,
    protocolo: receiptProtocol(request.id),
    solicitacaoId: request.id,
    origem: request.origin ?? 'MANUAL',
    condominio: condominium
      ? {
          nome: condominium.name,
          endereco: condominium.address ?? null,
          bairro: condominium.neighborhood ?? null,
        }
      : null,
    sindico: request.user ? { nome: request.user.name, email: request.user.email } : null,
    empresaColetora: request.company
      ? {
          nome: request.company.name,
          cnpj: request.company.cnpj ?? request.companyCnpjSnapshot ?? null,
        }
      : null,
    barril: barrel
      ? {
          codigo: barrel.code,
          capacidadeLitros: capacity,
          limiteAlertaPercentual: barrel.alertThreshold ?? DEFAULT_ALERT_THRESHOLD,
        }
      : null,
    sensor: sensor?.code ?? null,
    nivelNoAlertaPercentual: level,
    volumeEstimadoLitros:
      capacity === null || level === null ? null : Math.round((capacity * level) / 100),
    solicitadaEm: iso(request.requestedAt),
    agendadaPara: iso(request.scheduledDate),
    concluidaEm: iso(request.completedAt),
    emitidoEm: now.toISOString(),
    armazenamento: {
      provedor: storage.provider,
      container: storage.container,
      blob: storage.name,
    },
  };
}
