import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Condominium } from '../sensor/entities/condominium.entity';
import { Barrel } from '../sensor/entities/barrel.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { SensorReading } from '../sensor/entities/sensor-reading.entity';
import { CollectionRequest } from '../collection-request/collection-request.entity';
import { User } from '../user/entities/user/user.entity';
import { Company } from '../company/entities/company/company.entity';
import { SensorModule } from '../sensor/sensor.module';
import { CollectionRequestModule } from '../collection-request/collection-request.module';
import { DemoModule } from '../demo/demo.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Condominium,
      Barrel,
      Sensor,
      SensorReading,
      CollectionRequest,
      User,
      Company,
    ]),
    SensorModule,
    CollectionRequestModule,
    DemoModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
