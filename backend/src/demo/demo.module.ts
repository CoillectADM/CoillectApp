import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user/user.entity';
import { Company } from '../company/entities/company/company.entity';
import { Condominium } from '../sensor/entities/condominium.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { DemoSeedService } from './demo-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company, Condominium, Sensor])],
  providers: [DemoSeedService],
  exports: [DemoSeedService],
})
export class DemoModule {}
