import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';

@Injectable()
export class UserService {
  async findOneById(id: number) {}

  async findOneByEmail(email: string) {}

  async updateUser(id: number, user: Partial<CreateUserDto>) {}

  async createUser(user: CreateUserDto) {}
  async deleteUser(id: number) {}
}
