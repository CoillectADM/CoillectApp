import { join } from 'path';

/**
 * Configuração do armazenamento em nuvem (Atividade A02 — Computação em Nuvem II).
 *
 * - AZURE_STORAGE_CONNECTION_STRING definida → Azure Storage de verdade
 *   (ou o emulador Azurite com "UseDevelopmentStorage=true").
 * - Sem a variável → modo local: comprovantes em disco e fila em memória.
 *   A API funciona igual, só sem o Azure.
 */
export interface CloudConfig {
  mode: 'azure' | 'local';
  connectionString: string | null;
  /** Container do Blob Storage com os comprovantes de coleta. */
  container: string;
  /** Fila do Queue Storage que entrega as notificações aos apps. */
  queue: string;
  /** Fila para mensagens que falharam várias vezes (poison queue). */
  poisonQueue: string;
  /** Intervalo da leitura da fila quando ela está ativa. */
  pollMs: number;
  /** Intervalo máximo da leitura quando a fila fica vazia (backoff). */
  pollMaxMs: number;
  /** Tentativas antes de mover a mensagem para a poison queue. */
  maxDequeueCount: number;
  /** Pasta dos comprovantes no modo local. */
  localDir: string;
}

function positive(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Nomes de container/fila: minúsculas, números e hífen (regra do Azure). */
function storageName(value: string | undefined, fallback: string): string {
  const name = (value || '').trim().toLowerCase();
  return /^[a-z0-9](?:[a-z0-9-]{1,61})[a-z0-9]$/.test(name) ? name : fallback;
}

export function cloudConfigFromEnv(env: NodeJS.ProcessEnv = process.env): CloudConfig {
  const connectionString = (env.AZURE_STORAGE_CONNECTION_STRING || '').trim() || null;
  const forced = (env.CLOUD_STORAGE || '').trim().toLowerCase();
  const mode = forced === 'local' || !connectionString ? 'local' : 'azure';
  const queue = storageName(env.AZURE_STORAGE_QUEUE, 'coillect-notificacoes');
  const pollMs = positive(env.QUEUE_POLL_MS, 1000);
  return {
    mode,
    connectionString: mode === 'azure' ? connectionString : null,
    container: storageName(env.AZURE_STORAGE_CONTAINER, 'comprovantes-coleta'),
    queue,
    poisonQueue: `${queue}-poison`.slice(0, 63),
    pollMs,
    pollMaxMs: Math.max(pollMs, positive(env.QUEUE_POLL_MAX_MS, 5000)),
    maxDequeueCount: positive(env.QUEUE_MAX_DEQUEUE, 5),
    localDir: env.STORAGE_LOCAL_DIR || join(process.cwd(), 'storage-local'),
  };
}
