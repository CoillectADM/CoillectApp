import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import { UserRepository } from './repositories/user-repository/user-repository';
import { User } from './entities/user/user.entity';
import { UpdateUserDto } from './dto/update-user.dto/update-user.dto';
import process_data_nasc from 'src/utils/data_transform/data_transform';
import { CreateUserAddressDto } from './dto/create-user-address.dto/create-user-address.dto';
import { UserAddress } from './entities/user_address/user_address';
import { UserAddressRepository } from './repositories/user-address-repository/user-address-repository';
import { UserPhoneNumberRepository } from './repositories/user-phone-number-repository/user-phone-number-repository';
import { UpdateUserAddressDto } from './dto/update-user-address.dto/update-user-address.dto';
import { CreateUserPhoneNumberDto } from './dto/create-user-phone-number.dto/create-user-phone-number.dto';
import { UserPhoneNumber } from './entities/user_phone_number/user_phone_number';
import { UpdateUserPhoneNumberDto } from './dto/update-user-phone-number.dto/update-user-phone-number.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userAddressRepository: UserAddressRepository,
    private readonly userPhoneRepository: UserPhoneNumberRepository,
  ) {}
  async findOneById(id: number): Promise<{ user: User }> {
    return {
      user: await this.userRepository.findOneById(id),
    };
  }

  async findOneByEmail(email: string): Promise<{ user: User }> {
    return {
      user: await this.userRepository.findOneByEmail(email),
    };
  }

  async updateUser(
    id: number,
    user: Partial<UpdateUserDto>,
  ): Promise<{ old: User; updatedUser: User }> {
    const oldUser = await this.userRepository.findOneById(id);

    let updatedUser;

    if (user.data_nascimento) {
      updatedUser = await this.userRepository.updateUser(
        id,
        process_data_nasc(user, user.data_nascimento),
      );
    } else {
      updatedUser = updatedUser = await this.userRepository.updateUser(
        id,
        user,
      );
    }

    return {
      old: oldUser,
      updatedUser,
    };
  }

  async createUser(user: CreateUserDto): Promise<User> {
    return this.userRepository.createUser(
      process_data_nasc(user, user.data_nascimento),
    );
  }
  async deleteUser(id: number): Promise<{ deletedUser: User }> {
    return {
      deletedUser: await this.userRepository.deleteUser(id),
    };
  }

  async addUserAddress(
    id: number,
    data: CreateUserAddressDto,
  ): Promise<{ address: UserAddress }> {
    return {
      address: await this.userAddressRepository.addAddress(id, data),
    };
  }
  async findUserAddresses(
    userId: number,
  ): Promise<{ addresses: UserAddress[] }> {
    return {
      addresses: await this.userAddressRepository.findUserAddresses(userId),
    };
  }

  async findUserAddress(addressId: number): Promise<{ address: UserAddress }> {
    return {
      address: await this.userAddressRepository.findAddressById(addressId),
    };
  }

  async deleteUserAddress(
    addressId: number,
  ): Promise<{ address: UserAddress }> {
    return {
      address: await this.userAddressRepository.removeAddress(addressId),
    };
  }

  async updateUserAddress(
    addressId: number,
    data: Partial<UpdateUserAddressDto>,
  ): Promise<{ old: UserAddress; new: UserAddress }> {
    const old = await this.userAddressRepository.findAddressById(addressId);
    return {
      old,
      new: await this.userAddressRepository.updateAddress(addressId, data),
    };
  }

  async addUserPhoneNumber(
    userId: number,
    data: CreateUserPhoneNumberDto,
  ): Promise<{ phone_number: UserPhoneNumber }> {
    return {
      phone_number: await this.userPhoneRepository.createPhoneNumber(
        userId,
        data,
      ),
    };
  }
  async findAllUserPhoneNumbers(
    userId: number,
  ): Promise<{ user_id: number; phone_numbers: UserPhoneNumber[] }> {
    return {
      phone_numbers:
        await this.userPhoneRepository.findUserPhoneNumbers(userId),
      user_id: userId,
    };
  }

  async findPhoneNumberById(
    phoneId: number,
  ): Promise<{ phone_number: UserPhoneNumber }> {
    return {
      phone_number: await this.userPhoneRepository.findById(phoneId),
    };
  }

  async deletePhoneNumber(
    phoneId: number,
  ): Promise<{ phone_number: UserPhoneNumber }> {
    return {
      phone_number: await this.userPhoneRepository.deletePhoneNumber(phoneId),
    };
  }

  async updatePhoneNumber(
    phoneId: number,
    data: Partial<UpdateUserPhoneNumberDto>,
  ): Promise<{ old: UserPhoneNumber; new: UserPhoneNumber }> {
    const response = await this.userPhoneRepository.updatePhoneNumber(
      phoneId,
      data,
    );

    return response;
  }
}
