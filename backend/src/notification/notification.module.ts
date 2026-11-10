import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationListener } from './notification.listener';
import { NotificationController } from './notification.controller';
import { CompanyNotificationController } from './company-notification.controller';
import { HelpRequestController } from './help-request.controller';
import { CollectionRequest } from '../collection-request/collection-request.entity';
import { CollectionRequestModule } from '../collection-request/collection-request.module';
import { Condominium } from '../sensor/entities/condominium.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, CollectionRequest, Condominium]),
    // ReceiptService: comprovante no Blob Storage quando a coleta é concluída.
    CollectionRequestModule,
  ],
  // A rota da empresa (notifications/company) vem antes da do síndico.
  controllers: [CompanyNotificationController, NotificationController, HelpRequestController],
  providers: [NotificationService, NotificationListener],
  exports: [NotificationService],
})
export class NotificationModule {}
