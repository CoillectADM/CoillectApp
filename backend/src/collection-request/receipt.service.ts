import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionRequest } from './collection-request.entity';
import { BlobStorageService } from '../cloud/blob-storage.service';
import { logEvent } from '../cloud/telemetry';
import { CollectionReceipt, buildReceipt, receiptBlobName } from './receipt';

export interface ReceiptView {
  requestId: number;
  receipt: CollectionReceipt;
  storage: { mode: 'azure' | 'local'; provider: string; container: string; blob: string };
}

/** Gera e lê os comprovantes de coleta no Blob Storage. */
@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    @InjectRepository(CollectionRequest)
    private readonly requests: Repository<CollectionRequest>,
    private readonly blobs: BlobStorageService,
  ) {}

  /**
   * Grava o comprovante da coleta concluída. Idempotente: o nome do blob vem do
   * id e da data de conclusão, então reprocessar a mesma mensagem da fila
   * sobrescreve o mesmo arquivo.
   */
  async generate(requestId: number): Promise<string | null> {
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request || request.status !== 'COMPLETED') return null;
    const name = receiptBlobName(request);
    const receipt = buildReceipt(request, {
      provider: this.blobs.provider,
      container: this.blobs.container,
      name,
    });
    const stored = await this.blobs.save(
      name,
      JSON.stringify(receipt, null, 2),
      'application/json; charset=utf-8',
    );
    if (request.receiptBlob !== name) {
      await this.requests.update(request.id, { receiptBlob: name });
    }
    logEvent('comprovante_gerado', {
      requestId: request.id,
      protocolo: receipt.protocolo,
      condominio: receipt.condominio?.nome ?? null,
      provedor: stored.provider,
      container: stored.container,
      blob: stored.name,
      bytes: stored.size,
    });
    this.logger.log(`Comprovante da coleta #${request.id} gravado em ${stored.provider}: ${name}`);
    return name;
  }

  /** Comprovante da solicitação, ou null se ainda não foi gerado. */
  async read(request: CollectionRequest): Promise<ReceiptView | null> {
    if (!request.receiptBlob) return null;
    const content = await this.blobs.read(request.receiptBlob);
    if (!content) return null;
    return {
      requestId: request.id,
      receipt: JSON.parse(content.toString('utf8')) as CollectionReceipt,
      storage: {
        mode: this.blobs.mode,
        provider: this.blobs.provider,
        container: this.blobs.container,
        blob: request.receiptBlob,
      },
    };
  }
}
