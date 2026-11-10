import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationListener } from './notification.listener';
import { NotificationController } from './notification.controller';
import { CompanyNotificationController } from './company-notification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  // A rota da empresa (notifications/company) vem antes da do síndico.
  controllers: [CompanyNotificationController, NotificationController],
  providers: [NotificationService, NotificationListener],
  exports: [NotificationService],
})
export class NotificationModule {}
