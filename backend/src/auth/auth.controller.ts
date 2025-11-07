// src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CompanyLoginDto } from './dto/company-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // -----------------------------
  // LOGIN DE USUÁRIO
  // -----------------------------
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  // -----------------------------
  // LOGIN DE EMPRESA
  // -----------------------------
  @Post('company/login')
  async companyLogin(@Body() loginDto: CompanyLoginDto) {
    const company = await this.authService.validateCompany(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.companyLogin(company);
  }
}
