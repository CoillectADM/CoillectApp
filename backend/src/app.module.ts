import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buildDatabaseOptions } from './config/database.config';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { CollectionRequestModule } from './collection-request/collection-request.module';
import { SensorModule } from './sensor/sensor.module';
import { NotificationModule } from './notification/notification.module';
import { DemoModule } from './demo/demo.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Banco configurado por variáveis de ambiente (DATABASE_URL ou DATABASE_*): ver config/database.config.ts
    TypeOrmModule.forRootAsync({ useFactory: () => buildDatabaseOptions() }),
    EventsModule,
    UserModule,
    AuthModule,
    CompanyModule,
    CollectionRequestModule,
    SensorModule,
    NotificationModule,
    DemoModule,
    AdminModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
