import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { CollectionRequest } from '../collection-request.entity';

@Injectable()
export class CollectionRequestRepository extends Repository<CollectionRequest> {
  constructor(dataSource: DataSource) {
    super(CollectionRequest, dataSource.createEntityManager());
  }

  // "Ativa" para o usuário = ainda não concluída nem cancelada
  async findActiveByUser(userId: number): Promise<CollectionRequest | null> {
    return this.findOne({
      where: {
        user: { id: userId },
        status: In(['PENDING', 'SCHEDULED', 'REFUSED']),
      },
      order: { requestedAt: 'DESC' },
    });
  }
}
