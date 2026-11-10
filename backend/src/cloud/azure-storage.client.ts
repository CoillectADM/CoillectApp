import { createHmac } from 'crypto';

/**
 * Cliente mínimo do Azure Storage (Blob + Queue) usando a API REST oficial.
 *
 * Por que REST e não o SDK @azure/storage-*: não adiciona dependências ao
 * backend, e cada chamada fica visível (PUT do blob, POST da mensagem...),
 * o que ajuda a explicar a integração na disciplina de Computação em Nuvem.
 *
 * Autenticação suportada (vem da connection string do portal do Azure):
 *  - Shared Key (AccountName + AccountKey): cada requisição é assinada com
 *    HMAC-SHA256, como descrito em "Authorize with Shared Key" na documentação;
 *  - SAS (SharedAccessSignature=...): o token vai na URL;
 *  - UseDevelopmentStorage=true: emulador Azurite na máquina local.
 */

/** Versão da API REST do Storage (aceita pelo Azure e pelo Azurite). */
export const STORAGE_API_VERSION = '2021-08-06';

const AZURITE_ACCOUNT = 'devstoreaccount1';
/**
 * Chave PÚBLICA e fixa do emulador Azurite (publicada na documentação da
 * Microsoft). Não é segredo e só funciona no emulador local.
 */
const AZURITE_PUBLIC_KEY =
  'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';

export interface StorageAccount {
  accountName: string;
  /** Chave decodificada (Shared Key); null quando a conexão usa SAS. */
  accountKey: Buffer | null;
  /** Token SAS sem o "?" inicial; null quando a conexão usa Shared Key. */
  sas: string | null;
  blobEndpoint: string;
  queueEndpoint: string;
  /** true = Azurite (emulador local). */
  emulator: boolean;
}

export class AzureStorageError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'AzureStorageError';
  }
}

/** Lê a connection string do Storage Account (formato do portal do Azure). */
export function parseConnectionString(raw: string): StorageAccount {
  const parts = new Map<string, string>();
  for (const piece of (raw || '').split(';')) {
    const trimmed = piece.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    parts.set(trimmed.slice(0, eq).trim().toLowerCase(), trimmed.slice(eq + 1).trim());
  }
  const trimSlash = (value: string) => value.replace(/\/+$/, '');

  if ((parts.get('usedevelopmentstorage') || '').toLowerCase() === 'true') {
    // Azurite: blob na porta 10000 e fila na 10001. No docker compose o host
    // do emulador muda (DevelopmentStorageProxyUri=http://azurite).
    const host = trimSlash(parts.get('developmentstorageproxyuri') || 'http://127.0.0.1');
    return {
      accountName: AZURITE_ACCOUNT,
      accountKey: Buffer.from(AZURITE_PUBLIC_KEY, 'base64'),
      sas: null,
      blobEndpoint: `${host}:10000/${AZURITE_ACCOUNT}`,
      queueEndpoint: `${host}:10001/${AZURITE_ACCOUNT}`,
      emulator: true,
    };
  }

  const protocol = parts.get('defaultendpointsprotocol') || 'https';
  const suffix = parts.get('endpointsuffix') || 'core.windows.net';
  let accountName = parts.get('accountname') || '';
  const blobEndpoint = trimSlash(
    parts.get('blobendpoint') ||
      (accountName ? `${protocol}://${accountName}.blob.${suffix}` : ''),
  );
  const queueEndpoint = trimSlash(
    parts.get('queueendpoint') ||
      (accountName ? `${protocol}://${accountName}.queue.${suffix}` : ''),
  );
  if (!blobEndpoint || !queueEndpoint) {
    throw new Error(
      'Connection string do Storage sem AccountName nem BlobEndpoint/QueueEndpoint.',
    );
  }
  if (!accountName) {
    // Connection string só com SAS: o nome da conta é o primeiro pedaço do host.
    accountName = new URL(blobEndpoint).hostname.split('.')[0];
  }
  const key = parts.get('accountkey');
  const sas = (parts.get('sharedaccesssignature') || '').replace(/^\?/, '') || null;
  if (!key && !sas) {
    throw new Error(
      'Connection string do Storage precisa de AccountKey ou SharedAccessSignature.',
    );
  }
  const emulator = /^(127\.0\.0\.1|localhost|azurite)$/i.test(
    new URL(blobEndpoint).hostname,
  );
  return {
    accountName,
    accountKey: key ? Buffer.from(key, 'base64') : null,
    sas,
    blobEndpoint,
    queueEndpoint,
    emulator,
  };
}

/** Recurso canônico da assinatura Shared Key: /conta/caminho + parâmetros ordenados. */
export function canonicalizedResource(accountName: string, url: URL): string {
  let resource = `/${accountName}${url.pathname || '/'}`;
  const params = new Map<string, string[]>();
  url.searchParams.forEach((value, name) => {
    const key = name.toLowerCase();
    params.set(key, [...(params.get(key) || []), value]);
  });
  for (const key of [...params.keys()].sort()) {
    resource += `\n${key}:${params.get(key).sort().join(',')}`;
  }
  return resource;
}

/** Cabeçalhos x-ms-* em minúsculas, ordenados, um por linha. */
export function canonicalizedHeaders(headers: Record<string, string>): string {
  return Object.keys(headers)
    .map((name) => name.toLowerCase())
    .filter((name) => name.startsWith('x-ms-'))
    .sort()
    .map((name) => `${name}:${String(headerValue(headers, name)).trim()}\n`)
    .join('');
}

function headerValue(headers: Record<string, string>, name: string): string {
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name);
  return found === undefined ? '' : String(headers[found]);
}

/** Texto assinado (StringToSign) do Shared Key para Blob e Queue. */
export function stringToSign(
  method: string,
  url: URL,
  headers: Record<string, string>,
  accountName: string,
): string {
  const contentLength = headerValue(headers, 'content-length');
  return (
    [
      method.toUpperCase(),
      headerValue(headers, 'content-encoding'),
      headerValue(headers, 'content-language'),
      contentLength === '0' ? '' : contentLength,
      headerValue(headers, 'content-md5'),
      headerValue(headers, 'content-type'),
      '', // Date: usamos x-ms-date
      headerValue(headers, 'if-modified-since'),
      headerValue(headers, 'if-match'),
      headerValue(headers, 'if-none-match'),
      headerValue(headers, 'if-unmodified-since'),
      headerValue(headers, 'range'),
    ].join('\n') +
    '\n' +
    canonicalizedHeaders(headers) +
    canonicalizedResource(accountName, url)
  );
}

export function sharedKeyAuthorization(
  account: StorageAccount,
  method: string,
  url: URL,
  headers: Record<string, string>,
): string {
  const signature = createHmac('sha256', account.accountKey)
    .update(stringToSign(method, url, headers, account.accountName), 'utf8')
    .digest('base64');
  return `SharedKey ${account.accountName}:${signature}`;
}

export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function xmlUnescape(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Conteúdo de cada <tag>...</tag> encontrado no XML (sem atributos aninhados). */
export function xmlBlocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) out.push(match[1]);
  return out;
}

export function xmlText(xml: string, tag: string): string | null {
  const [first] = xmlBlocks(xml, tag);
  return first === undefined ? null : xmlUnescape(first);
}

interface StorageResponse {
  status: number;
  headers: Headers;
  body: Buffer;
}

/** Uma chamada REST ao Storage, assinada (Shared Key) ou com SAS. */
async function storageRequest(
  account: StorageAccount,
  endpoint: string,
  method: string,
  path: string,
  options: {
    query?: Record<string, string>;
    body?: Buffer;
    headers?: Record<string, string>;
    ok?: number[];
    timeoutMs?: number;
  } = {},
): Promise<StorageResponse> {
  const query = Object.entries(options.query || {}).map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
  );
  if (account.sas) query.push(account.sas);
  const url = new URL(`${endpoint}${path}${query.length ? `?${query.join('&')}` : ''}`);

  const headers: Record<string, string> = {
    'x-ms-date': new Date().toUTCString(),
    'x-ms-version': STORAGE_API_VERSION,
    ...(options.headers || {}),
  };
  const body = options.body;
  if (account.accountKey && !account.sas) {
    // O fetch do Node envia Content-Length sozinho; aqui só entra na assinatura.
    const signed = { ...headers };
    if (body !== undefined) signed['content-length'] = String(body.length);
    headers.authorization = sharedKeyAuthorization(account, method, url, signed);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : new Uint8Array(body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
  });
  const raw = Buffer.from(await response.arrayBuffer());
  const accepted = options.ok || [200, 201, 202, 204];
  if (!accepted.includes(response.status)) {
    const code = response.headers.get('x-ms-error-code');
    const detail = xmlText(raw.toString('utf8'), 'Message') || raw.toString('utf8').slice(0, 300);
    throw new AzureStorageError(
      response.status,
      code,
      `Azure Storage ${method} ${url.pathname} → HTTP ${response.status}${code ? ` (${code})` : ''}: ${detail}`,
    );
  }
  return { status: response.status, headers: response.headers, body: raw };
}

function blobPath(name: string): string {
  return name
    .split('/')
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join('/');
}

export interface BlobItem {
  name: string;
  size: number;
  lastModified: string | null;
  contentType: string | null;
}

/** Container do Blob Storage (ex.: "comprovantes-coleta"). */
export class AzureBlobContainer {
  constructor(
    readonly account: StorageAccount,
    readonly container: string,
  ) {}

  /** PUT ?restype=container — 201 criado; 409 já existia. */
  async createIfNotExists(): Promise<boolean> {
    const res = await storageRequest(
      this.account,
      this.account.blobEndpoint,
      'PUT',
      `/${this.container}`,
      { query: { restype: 'container' }, body: Buffer.alloc(0), ok: [201, 409] },
    );
    return res.status === 201;
  }

  /** Put Blob (block blob): grava/sobrescreve o arquivo inteiro. */
  async upload(name: string, content: Buffer, contentType: string): Promise<void> {
    await storageRequest(
      this.account,
      this.account.blobEndpoint,
      'PUT',
      `/${this.container}/${blobPath(name)}`,
      {
        body: content,
        headers: { 'x-ms-blob-type': 'BlockBlob', 'content-type': contentType },
        ok: [201],
      },
    );
  }

  /** Get Blob: conteúdo do arquivo, ou null se não existir. */
  async download(name: string): Promise<Buffer | null> {
    const res = await storageRequest(
      this.account,
      this.account.blobEndpoint,
      'GET',
      `/${this.container}/${blobPath(name)}`,
      { ok: [200, 404] },
    );
    return res.status === 404 ? null : res.body;
  }

  /** List Blobs (ordem alfabética do nome, até 5000 por página). */
  async list(prefix = ''): Promise<BlobItem[]> {
    const items: BlobItem[] = [];
    let marker = '';
    for (let page = 0; page < 20; page++) {
      const query: Record<string, string> = { restype: 'container', comp: 'list' };
      if (prefix) query.prefix = prefix;
      if (marker) query.marker = marker;
      const res = await storageRequest(
        this.account,
        this.account.blobEndpoint,
        'GET',
        `/${this.container}`,
        { query, ok: [200, 404] },
      );
      if (res.status === 404) return items;
      const xml = res.body.toString('utf8');
      for (const blob of xmlBlocks(xml, 'Blob')) {
        items.push({
          name: xmlText(blob, 'Name') || '',
          size: Number(xmlText(blob, 'Content-Length') || 0),
          lastModified: xmlText(blob, 'Last-Modified'),
          contentType: xmlText(blob, 'Content-Type'),
        });
      }
      marker = xmlText(xml, 'NextMarker') || '';
      if (!marker) break;
    }
    return items;
  }

  /** URL pública do blob (só abre direto se o container permitir acesso anônimo). */
  urlOf(name: string): string {
    return `${this.account.blobEndpoint}/${this.container}/${blobPath(name)}`;
  }
}

export interface ReceivedQueueMessage {
  messageId: string;
  popReceipt: string;
  dequeueCount: number;
  insertionTime: string | null;
  text: string;
}

/** Fila do Queue Storage (ex.: "coillect-notificacoes"). */
export class AzureQueue {
  constructor(
    readonly account: StorageAccount,
    readonly queue: string,
  ) {}

  /** PUT na fila — 201 criada; 204/409 já existia. */
  async createIfNotExists(): Promise<boolean> {
    const res = await storageRequest(
      this.account,
      this.account.queueEndpoint,
      'PUT',
      `/${this.queue}`,
      { body: Buffer.alloc(0), ok: [201, 204, 409] },
    );
    return res.status === 201;
  }

  /** Put Message: o texto (JSON) vai dentro de <QueueMessage><MessageText>. */
  async send(text: string, ttlSeconds = 7 * 24 * 3600): Promise<string | null> {
    const xml =
      '<?xml version="1.0" encoding="utf-8"?>' +
      `<QueueMessage><MessageText>${xmlEscape(text)}</MessageText></QueueMessage>`;
    const res = await storageRequest(
      this.account,
      this.account.queueEndpoint,
      'POST',
      `/${this.queue}/messages`,
      {
        query: { messagettl: String(ttlSeconds) },
        body: Buffer.from(xml, 'utf8'),
        headers: { 'content-type': 'application/xml; charset=utf-8' },
        ok: [201],
      },
    );
    return xmlText(res.body.toString('utf8'), 'MessageId');
  }

  /** Get Messages: retira até `max` mensagens e as esconde por `visibilitySeconds`. */
  async receive(max = 16, visibilitySeconds = 30): Promise<ReceivedQueueMessage[]> {
    const res = await storageRequest(
      this.account,
      this.account.queueEndpoint,
      'GET',
      `/${this.queue}/messages`,
      {
        query: {
          numofmessages: String(Math.min(Math.max(max, 1), 32)),
          visibilitytimeout: String(visibilitySeconds),
        },
        ok: [200],
      },
    );
    return xmlBlocks(res.body.toString('utf8'), 'QueueMessage').map((block) => ({
      messageId: xmlText(block, 'MessageId') || '',
      popReceipt: xmlText(block, 'PopReceipt') || '',
      dequeueCount: Number(xmlText(block, 'DequeueCount') || 1),
      insertionTime: xmlText(block, 'InsertionTime'),
      text: xmlText(block, 'MessageText') || '',
    }));
  }

  /** Delete Message: confirma o processamento (sem isso a mensagem volta para a fila). */
  async delete(messageId: string, popReceipt: string): Promise<void> {
    await storageRequest(
      this.account,
      this.account.queueEndpoint,
      'DELETE',
      `/${this.queue}/messages/${encodeURIComponent(messageId)}`,
      { query: { popreceipt: popReceipt }, ok: [204, 404] },
    );
  }

  /** Quantidade aproximada de mensagens aguardando (cabeçalho x-ms-approximate-messages-count). */
  async approximateCount(): Promise<number> {
    const res = await storageRequest(
      this.account,
      this.account.queueEndpoint,
      'GET',
      `/${this.queue}`,
      { query: { comp: 'metadata' }, ok: [200] },
    );
    return Number(res.headers.get('x-ms-approximate-messages-count') || 0);
  }
}
