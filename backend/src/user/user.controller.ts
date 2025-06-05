import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import { UserService } from './user.service';
import { APIResponse } from 'src/utils/response/response';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get(':id')
  async findOneById(@Param('id') id: number): Promise<APIResponse> {
    const response = await this.userService.findOneById(id);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(200)
      .build();
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<APIResponse> {
    const response = await this.userService.createUser(dto);

    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(201)
      .build();
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() dto: Partial<CreateUserDto>,
  ): Promise<APIResponse> {
    const response = await this.userService.updateUser(id, dto);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(201)
      .build();
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: number): Promise<APIResponse> {
    const response = await this.userService.deleteUser(id);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(201)
      .build();
  }
}
