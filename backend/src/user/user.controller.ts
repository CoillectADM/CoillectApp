import { Controller, Get } from '@nestjs/common';

@Controller('user')
export class UserController {
  @Get(':id')
  async findOneById(@Param('id') id: number) {}
}
