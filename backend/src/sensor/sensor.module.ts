import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Condominium } from './entities/condominium.entity';
import { Barrel } from './entities/barrel.entity';
import { Sensor } from './entities/sensor.entity';
import { SensorReading } from './entities/sensor-reading.entity';
import { CollectionRequest } from '../collection-request/collection-request.entity';
import { SensorService } from './sensor.service';
import { SensorAlertService } from './sensor-alert.service';
import { SensorController } from './sensor.controller';
import { SensorAlertController } from './sensor-alert.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Condominium,
      Barrel,
      Sensor,
      SensorReading,
      CollectionRequest,
    ]),
  ],
  controllers: [SensorAlertController, SensorController],
  providers: [SensorService, SensorAlertService],
  exports: [SensorService, SensorAlertService],
})
export class SensorModule {}
