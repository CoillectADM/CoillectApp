import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user/user.entity';
import { Repository } from 'typeorm';
import { UpdateUserDto } from 'src/user/dto/update-user.dto/update-user.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto/create-user.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }
  async findOneById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateUser(id: number, data: Partial<UpdateUserDto>): Promise<User> {
    await this.repo.update(id, data);

    return this.repo.findOneOrFail({ where: { id } });
  }

  async deleteUser(id: number): Promise<User> {
    const userToDelete = await this.repo.findOne({ where: { id } });

    this.repo.delete(id);
    return userToDelete;
  }
}
