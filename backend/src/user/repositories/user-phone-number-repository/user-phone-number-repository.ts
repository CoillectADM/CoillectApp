import { Repository } from 'typeorm';
import { UserRepository } from '../user-repository/user-repository';
import { UserPhoneNumber } from 'src/user/entities/user_phone_number/user_phone_number';
import { CreateUserPhoneNumberDto } from 'src/user/dto/create-user-phone-number.dto/create-user-phone-number.dto';
import { UpdateUserPhoneNumberDto } from 'src/user/dto/update-user-phone-number.dto/update-user-phone-number.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
@Injectable()
export class UserPhoneNumberRepository {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectRepository(UserPhoneNumber)
    private readonly userPhoneNumberRepository: Repository<UserPhoneNumber>,
  ) {}

  async findById(id: number) {
    return await this.userPhoneNumberRepository.findOne({ where: { id } });
  }

  async createPhoneNumber(userId: number, body: CreateUserPhoneNumberDto) {
    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return;
    }
    const phoneNumber = this.userPhoneNumberRepository.create({
      ...body,
      usuario: user,
    });

    await this.userPhoneNumberRepository.save(phoneNumber);

    return phoneNumber;
  }

  async findUserPhoneNumbers(userId: number) {
    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return;
    }
    const phoneNumbers = await this.userPhoneNumberRepository.findBy({
      usuario: { id: userId },
    });

    return phoneNumbers;
  }

  async deletePhoneNumber(phoneId: number) {
    const phoneNumber = await this.userPhoneNumberRepository.findOne({
      where: { id: phoneId },
    });

    await this.userPhoneNumberRepository.delete({ id: phoneId });

    return phoneNumber;
  }

  async updatePhoneNumber(
    phoneId: number,
    body: Partial<UpdateUserPhoneNumberDto>,
  ) {
    const old = await this.userPhoneNumberRepository.findOne({
      where: { id: phoneId },
    });

    await this.userPhoneNumberRepository.update(phoneId, body);

    const new_obj = await this.userPhoneNumberRepository.findOneByOrFail({
      id: phoneId,
    });
    return {
      old,
      new: new_obj,
    };
  }
}
