import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user/user.entity';



@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

async validateUser(email: string, password: string) {
  const { user } = await this.userService.findOneByEmail(email);


  if (!user) {
    throw new UnauthorizedException('Email ou senha inválidos');
  }

  if (user.password !== password) {
    throw new UnauthorizedException('Email ou senha inválidos');
  }

  const { password: _, ...result } = user;
  return result;
}


  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}