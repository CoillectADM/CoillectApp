import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';

import { UserAddress } from './user/entities/user_address/user_address';
import { User } from './user/entities/user/user.entity';
import { UserPhoneNumber } from './user/entities/user_phone_number/user_phone_number';

import { CompanyModule } from './company/company.module';
import { Company } from './company/entities/company/company.entity';
import { CompanyAddress } from './company/entities/company_address/company-address.entity';
import { CompanyContact } from './company/entities/company_contact/company-contact.entity';
import { CompanyRepresentative } from './company/entities/company_representative/company-representative.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      port: parseInt(process.env.DATABASE_PORT),
      host: process.env.DATABASE_HOST,
      entities: [
        UserAddress,
        User,
        UserPhoneNumber,
        Company,
        CompanyAddress,
        CompanyContact,
        CompanyRepresentative,
      ],
      autoLoadEntities: true,
      synchronize: true,
      type: 'postgres',
    }),
    UserModule,
    AuthModule,
    CompanyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
