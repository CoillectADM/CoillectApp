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
import { CreateUserAddressDto } from './dto/create-user-address.dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto/update-user-address.dto';
import { CreateUserPhoneNumberDto } from './dto/create-user-phone-number.dto/create-user-phone-number.dto';
import { UpdateUserPhoneNumberDto } from './dto/update-user-phone-number.dto/update-user-phone-number.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('/address/:id')
  async findAddressById(@Param('id') id: number): Promise<APIResponse> {
    const response = await this.userService.findUserAddress(id);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(200)
      .setMessage('Endereço encontrado com sucesso')
      .build();
  }
  @Get(':id/addresses')
  async findAllUserAdresses(@Param('id') id: number): Promise<APIResponse> {
    const response = await this.userService.findUserAddresses(id);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(200)
      .setMessage('Endereços encontrados com sucesso')
      .build();
  }
  @Post('/address/:user_id')
  async createAddress(
    @Param('user_id') id: number,
    @Body() body: CreateUserAddressDto,
  ): Promise<APIResponse> {
    const response = await this.userService.addUserAddress(id, body);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(201)
      .setMessage(`Endereço para o usuário ${id} Criado com sucesso`)
      .build();
  }

  @Delete('/address/:id')
  async deleteAddress(@Param('id') id: number): Promise<APIResponse> {
    const response = await this.userService.deleteUserAddress(id);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(200)
      .setMessage('Endereço excluído com sucesso!')
      .build();
  }

  @Patch('/address/:id')
  async updateUserAddress(
    @Param('id') id: number,
    @Body() body: Partial<UpdateUserAddressDto>,
  ): Promise<APIResponse> {
    const response = await this.userService.updateUserAddress(id, body);

    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setMessage('Endereço atualizado com sucesso')
      .setStatusCode(200)
      .build();
  }

  @Get('/phone_number/:id')
  async findPhoneNumberById(@Param('id') id: number): Promise<APIResponse> {
    const response = await this.userService.findPhoneNumberById(id);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setStatusCode(200)
      .setRequester('root')
      .setMessage('Número de telefone encontrado com sucesso')
      .build();
  }

  @Get(':id/phone_numbers')
  async findAllUserPhoneNumbers(
    @Param('id') userId: number,
  ): Promise<APIResponse> {
    const response = await this.userService.findAllUserPhoneNumbers(userId);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setStatusCode(200)
      .setRequester('root')
      .setMessage(
        `Números de telefone do usuário ${userId} encontrados com sucesso`,
      )
      .build();
  }

  @Post('/phone_number/:user_id')
  async createPhoneNumber(
    @Param('user_id') userId: number,
    @Body() body: CreateUserPhoneNumberDto,
  ): Promise<APIResponse> {
    const response = await this.userService.addUserPhoneNumber(userId, body);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(201)
      .setMessage('Número de telefone adicionado com sucesso')
      .build();
  }

  @Patch('/phone_number/:id')
  async updatePhoneNumber(
    @Param('id') phoneId: number,
    @Body() body: Partial<UpdateUserPhoneNumberDto>,
  ): Promise<APIResponse> {
    const response = await this.userService.updatePhoneNumber(phoneId, body);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(200)
      .setMessage('Número de telefone atualizado com sucesso!')
      .build();
  }

  @Delete('/phone_number/:id')
  async deletePhoneNumber(@Param('id') phoneId: number): Promise<APIResponse> {
    const response = await this.userService.deletePhoneNumber(phoneId);

    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(200)
      .setMessage('Número de telefone excluído com sucesso!')
      .build();
  }
  @Get(':id')
  async findOneById(@Param('id') id: number): Promise<APIResponse> {
    const response = await this.userService.findOneById(id);
    return new APIResponse()
      .setData(response)
      .setError(false)
      .setRequester('root')
      .setStatusCode(200)
      .setMessage('Usuário encontrado com sucesso')
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
      .setMessage('Usuário criado com sucesso')
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
      .setMessage('Usuário atualizado com sucesso')
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
      .setMessage('Usuário excluído com sucesso')
      .build();
  }
}
