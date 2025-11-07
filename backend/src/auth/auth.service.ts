import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserService } from '../user/user.service';
import { CompanyService } from '../company/company.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly companyService: CompanyService,
    private readonly jwtService: JwtService,
  ) {}

  // -----------------------------
  // LOGIN DE USUÁRIO
  // -----------------------------
  async validateUser(email: string, password: string) {
    const { user } = await this.userService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: 'user' };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // -----------------------------
  // LOGIN DE EMPRESA
  // -----------------------------
  async validateCompany(email: string, password: string) {
    const company = await this.companyService.findByEmail(email);

    if (!company) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const passwordMatch = await bcrypt.compare(password, company.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const { password: _, ...result } = company;
    return result;
  }

  async companyLogin(company: any) {
    const payload = { sub: company.id, email: company.email, role: 'company' };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
