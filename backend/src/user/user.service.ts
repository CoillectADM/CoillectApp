import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import { UserRepository } from './repositories/user-repository';
import { User } from './entities/user/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
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
    user: Partial<CreateUserDto>,
  ): Promise<{ old: User; updatedUser: User }> {
    const oldUser = await this.userRepository.findOneById(id);
    const updatedUser = await this.userRepository.updateUser(id, user);

    return {
      old: oldUser,
      updatedUser,
    };
  }

  async createUser(user: CreateUserDto): Promise<User> {
    return this.userRepository.createUser(user);
  }
  async deleteUser(id: number): Promise<{ deletedUser: User }> {
    return {
      deletedUser: await this.userRepository.deleteUser(id),
    };
  }
}
