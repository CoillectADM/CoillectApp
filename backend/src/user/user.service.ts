import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import { UserRepository } from './repositories/user-repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
  async findOneById(id: number) {
    return this.userRepository.findOneById(id);
  }

  async findOneByEmail(email: string) {
    return this.userRepository.findOneByEmail(email);
  }

  async updateUser(id: number, user: Partial<CreateUserDto>) {
    return this.userRepository.updateUser(id, user);
  }

  async createUser(user: CreateUserDto) {
    return this.userRepository.createUser(user);
  }
  async deleteUser(id: number) {
    return this.userRepository.deleteUser(id);
  }
}
