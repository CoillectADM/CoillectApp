import { Injectable, NotFoundException } from '@nestjs/common';
import { CollectionRequestRepository } from './repository/collection-request.repository';
import { CreateCollectionRequestDto } from '../collection-request/dto/create-collection-request.dto';
import { UserService } from 'src/user/user.service';
import { CompanyService } from 'src/company/company.service';
import { CollectionRequest } from './collection-request.entity';
import { In } from 'typeorm';


@Injectable()
export class CollectionRequestService {
  constructor(
    private readonly collectionRepo: CollectionRequestRepository,
    private readonly userService: UserService,
    private readonly companyService: CompanyService,
  ) {}

  async createForUser(
    userId: number,
    dto: CreateCollectionRequestDto,
  ): Promise<CollectionRequest> {
    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const company = await this.companyService.findById(dto.companyId);
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const request = this.collectionRepo.create({
      user,
      company,
      status: 'PENDING',
      scheduledDate: null,
      userCpfSnapshot: null,
      companyCnpjSnapshot: company.cnpj,
      userAddressSnapshot: null,
    });

    return this.collectionRepo.save(request);
  }

  async getActiveForUser(userId: number): Promise<CollectionRequest | null> {
    return this.collectionRepo.findActiveByUser(userId);
  }

  async cancelForUser(
    requestId: number,
    userId: number,
  ): Promise<CollectionRequest> {
    const req = await this.collectionRepo.findOne({
      where: { id: requestId, user: { id: userId } },
    });
    if (!req) {
      throw new NotFoundException(
        'Solicitação não encontrada para este usuário',
      );
    }

    req.status = 'CANCELLED';
    req.scheduledDate = null;

    return this.collectionRepo.save(req);
  }

  async completeForUser(
    requestId: number,
    userId: number,
  ): Promise<CollectionRequest> {
    const req = await this.collectionRepo.findOne({
      where: { id: requestId, user: { id: userId } },
    });
    if (!req) {
      throw new NotFoundException(
        'Solicitação não encontrada para este usuário',
      );
    }

    req.status = 'COMPLETED';
    // mantém scheduledDate como estava

    return this.collectionRepo.save(req);
  }

  async getCompanyActiveRequests(
    companyId: number,
  ): Promise<CollectionRequest[]> {
    return this.collectionRepo.find({
      where: {
        company: { id: companyId },
        status: 'PENDING',
      },
      order: { requestedAt: 'ASC' },
    });
  }

  async acceptRequest(
    requestId: number,
    companyId: number,
  ): Promise<CollectionRequest> {
    const req = await this.collectionRepo.findOne({
      where: { id: requestId, company: { id: companyId } },
    });
    if (!req) {
      throw new NotFoundException(
        'Solicitação não encontrada para esta empresa',
      );
    }

    req.status = 'SCHEDULED';
    const baseDate = req.requestedAt ?? new Date();
    const scheduled = new Date(baseDate);
    scheduled.setDate(scheduled.getDate() + 5);
    req.scheduledDate = scheduled;

    return this.collectionRepo.save(req);
  }

  async refuseRequest(
    requestId: number,
    companyId: number,
  ): Promise<CollectionRequest> {
    const req = await this.collectionRepo.findOne({
      where: { id: requestId, company: { id: companyId } },
    });
    if (!req) {
      throw new NotFoundException(
        'Solicitação não encontrada para esta empresa',
      );
    }

    req.status = 'REFUSED';
    req.scheduledDate = null;

    return this.collectionRepo.save(req);
  }

    async getUserHistory(userId: number): Promise<CollectionRequest[]> {
    return this.collectionRepo.find({
      where: {
        user: { id: userId },
        status: In(['COMPLETED', 'CANCELLED', 'REFUSED']),
      },
      order: { requestedAt: 'DESC' },
    });
  }

  async getCompanyHistory(companyId: number): Promise<CollectionRequest[]> {
    return this.collectionRepo.find({
      where: {
        company: { id: companyId },
        status: In(['COMPLETED', 'CANCELLED', 'REFUSED']),
      },
      order: { requestedAt: 'DESC' },
    });
  }
}
