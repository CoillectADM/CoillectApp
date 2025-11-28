// src/auth/strategies/company-jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class CompanyJwtStrategy extends PassportStrategy(Strategy, 'company-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // usar o MESMO segredo do JwtModule
      secretOrKey: process.env.JWT_SECRET || 'supersegredo123',
    });
  }

  async validate(payload: any) {
    // manter o formato simples, só garantir que sub chega
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
