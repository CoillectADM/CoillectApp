// src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CompanyLoginDto } from './dto/company-login.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login de usuário' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Post('company/login')
  @ApiOperation({ summary: 'Login de empresa coletora' })
  async companyLogin(@Body() loginDto: CompanyLoginDto) {
    const company = await this.authService.validateCompany(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.companyLogin(company);
  }
}
