import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user/user.entity';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user-repository/user-repository';
import { UserAddressRepository } from './repositories/user-address-repository/user-address-repository';
import { UserPhoneNumberRepository } from './repositories/user-phone-number-repository/user-phone-number-repository';
import { UserAddress } from './entities/user_address/user_address';
import { UserPhoneNumber } from './entities/user_phone_number/user_phone_number';

@Module({
  providers: [
    UserService,
    UserRepository,
    UserAddressRepository,
    UserPhoneNumberRepository,
  ],
  exports: [UserService],
  imports: [TypeOrmModule.forFeature([User, UserAddress, UserPhoneNumber])],
  controllers: [UserController],
})
export class UserModule {}
