import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { CompanyModule } from '../company/company.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CompanyJwtStrategy } from './strategies/company-jwt.strategy';

@Module({
  imports: [
    UserModule,
    CompanyModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'coillect_super_secret_key',
      signOptions: { expiresIn: '1d' }, // expira em 24h
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, CompanyJwtStrategy],
})
export class AuthModule {}
