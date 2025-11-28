import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionRequest } from './collection-request.entity';
import { CollectionRequestRepository } from './repository/collection-request.repository';
import { CollectionRequestService } from './collection-request.service';
import { CollectionRequestController } from './collection-request.controller';
import { UserModule } from 'src/user/user.module';
import { CompanyModule } from 'src/company/company.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CollectionRequest]),
    UserModule,
    CompanyModule,
  ],
  controllers: [CollectionRequestController],
  providers: [CollectionRequestService, CollectionRequestRepository],
  exports: [CollectionRequestService],
})
export class CollectionRequestModule {}
