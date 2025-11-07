import { UserAddress } from 'src/user/entities/user_address/user_address';
import { Repository } from 'typeorm';
import { UserRepository } from '../user-repository/user-repository';
import { CreateUserAddressDto } from 'src/user/dto/create-user-address.dto/create-user-address.dto';
import { UpdateUserAddressDto } from 'src/user/dto/update-user-address.dto/update-user-address.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
@Injectable()
export class UserAddressRepository {
  constructor(
    @InjectRepository(UserAddress)
    private readonly userAddressRepository: Repository<UserAddress>,
    private readonly userRepository: UserRepository,
  ) {}

  async addAddress(userId: number, body: CreateUserAddressDto) {
    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return;
    }

    const address = this.userAddressRepository.create({
      ...body,
      usuario: user,
    });

    return this.userAddressRepository.save(address);
  }

  async removeAddress(addressId: number) {
    const address = await this.userAddressRepository.findOne({
      where: { id: addressId },
    });

    await this.userAddressRepository.delete(addressId);

    return address;
  }

  async updateAddress(addressId: number, body: Partial<UpdateUserAddressDto>) {
    await this.userAddressRepository.update(addressId, body);

    return await this.userAddressRepository.findOneByOrFail({ id: addressId });
  }

  async findUserAddresses(userId: number) {
    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return;
    }

    const userAddresses = await this.userAddressRepository.findBy({
      usuario: { id: userId },
    });

    return userAddresses;
  }

  async findAddressById(addressId: number) {
    return await this.userAddressRepository.findOne({
      where: { id: addressId },
    });
  }
}
