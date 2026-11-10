import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { dirname, join, normalize, relative, sep } from 'path';
import { AzureBlobContainer, BlobItem, parseConnectionString } from './azure-storage.client';
import { CloudConfig, cloudConfigFromEnv } from './cloud.config';
import { logEvent } from './telemetry';

export interface StoredBlob {
  provider: string;
  container: string;
  name: string;
  size: number;
  /** URL do blob no Azure (o container é privado: a leitura passa pela API). */
  url: string | null;
}

/** Onde o arquivo é gravado: Azure Blob Storage ou pasta local (sem Azure). */
interface BlobDriver {
  provider: string;
  account: string | null;
  endpoint: string | null;
  ensure(): Promise<void>;
  save(name: string, content: Buffer, contentType: string): Promise<string | null>;
  read(name: string): Promise<Buffer | null>;
  list(): Promise<BlobItem[]>;
}

class AzureBlobDriver implements BlobDriver {
  readonly provider: string;
  readonly account: string;
  readonly endpoint: string;

  constructor(private readonly container: AzureBlobContainer) {
    this.provider = container.account.emulator
      ? 'Azure Blob Storage (emulador Azurite)'
      : 'Azure Blob Storage';
    this.account = container.account.accountName;
    this.endpoint = container.account.blobEndpoint;
  }

  async ensure(): Promise<void> {
    await this.container.createIfNotExists();
  }

  async save(name: string, content: Buffer, contentType: string): Promise<string> {
    await this.container.upload(name, content, contentType);
    return this.container.urlOf(name);
  }

  read(name: string): Promise<Buffer | null> {
    return this.container.download(name);
  }

  list(): Promise<BlobItem[]> {
    return this.container.list();
  }
}

class LocalBlobDriver implements BlobDriver {
  readonly provider = 'Disco local (sem Azure)';
  readonly account = null;
  readonly endpoint: string;

  constructor(private readonly root: string) {
    this.endpoint = root;
  }

  private pathOf(name: string): string {
    const full = normalize(join(this.root, ...name.split('/')));
    if (relative(this.root, full).startsWith('..')) {
      throw new Error(`Nome de arquivo inválido: ${name}`);
    }
    return full;
  }

  async ensure(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async save(name: string, content: Buffer): Promise<null> {
    const path = this.pathOf(name);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, content);
    return null;
  }

  async read(name: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.pathOf(name));
    } catch {
      return null;
    }
  }

  async list(): Promise<BlobItem[]> {
    const items: BlobItem[] = [];
    const walk = async (dir: string): Promise<void> => {
      let entries: import('fs').Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile()) {
          const stat = await fs.stat(full);
          items.push({
            name: relative(this.root, full).split(sep).join('/'),
            size: stat.size,
            lastModified: stat.mtime.toUTCString(),
            contentType: 'application/json',
          });
        }
      }
    };
    await walk(this.root);
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/**
 * Blob Storage da Coillect: guarda o comprovante (JSON) de cada coleta concluída
 * no container "comprovantes-coleta". Sem Azure, grava os mesmos arquivos em disco.
 */
@Injectable()
export class BlobStorageService {
  private readonly logger = new Logger(BlobStorageService.name);
  private readonly config: CloudConfig;
  private readonly driver: BlobDriver;
  private ready: Promise<void> | null = null;
  private lastError: string | null = null;
  private saved = 0;

  constructor() {
    this.config = cloudConfigFromEnv();
    this.driver =
      this.config.mode === 'azure'
        ? new AzureBlobDriver(
            new AzureBlobContainer(
              parseConnectionString(this.config.connectionString),
              this.config.container,
            ),
          )
        : new LocalBlobDriver(join(this.config.localDir, this.config.container));
  }

  get mode(): 'azure' | 'local' {
    return this.config.mode;
  }

  get container(): string {
    return this.config.container;
  }

  get provider(): string {
    return this.driver.provider;
  }

  /** Cria o container na primeira gravação (ou tenta de novo se falhou antes). */
  private ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = this.driver.ensure().catch((error) => {
        this.ready = null;
        throw error;
      });
    }
    return this.ready;
  }

  async save(name: string, content: string | Buffer, contentType: string): Promise<StoredBlob> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    try {
      await this.ensureReady();
      const url = await this.driver.save(name, buffer, contentType);
      this.saved++;
      this.lastError = null;
      return {
        provider: this.driver.provider,
        container: this.config.container,
        name,
        size: buffer.length,
        url,
      };
    } catch (error) {
      this.lastError = String(error);
      throw error;
    }
  }

  async read(name: string): Promise<Buffer | null> {
    await this.ensureReady();
    return this.driver.read(name);
  }

  async status(recent = 10): Promise<Record<string, unknown>> {
    let items: BlobItem[] = [];
    let error = this.lastError;
    try {
      await this.ensureReady();
      items = await this.driver.list();
    } catch (failure) {
      error = String(failure);
      this.logger.warn(`Não foi possível listar o Blob Storage: ${failure}`);
    }
    // Mais recentes primeiro (data de modificação; empate pelo nome).
    const newest = [...items].sort(
      (a, b) =>
        (Date.parse(b.lastModified || '') || 0) - (Date.parse(a.lastModified || '') || 0) ||
        b.name.localeCompare(a.name),
    );
    return {
      provider: this.driver.provider,
      account: this.driver.account,
      endpoint: this.driver.endpoint,
      container: this.config.container,
      count: items.length,
      savedSinceStart: this.saved,
      recent: newest.slice(0, recent),
      error,
    };
  }

  /** Chamado na inicialização: registra o modo e cria o container. */
  async start(): Promise<void> {
    try {
      await this.ensureReady();
      logEvent('armazenamento_iniciado', {
        servico: 'blob',
        modo: this.config.mode,
        provedor: this.driver.provider,
        container: this.config.container,
      });
      this.logger.log(`Comprovantes em ${this.driver.provider} → ${this.config.container}`);
    } catch (error) {
      this.lastError = String(error);
      this.logger.error(
        `Blob Storage indisponível agora (${error}). A API continua; tenta de novo na próxima gravação.`,
      );
    }
  }
}
