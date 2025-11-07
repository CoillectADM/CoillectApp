import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret', // Pode substituir por variável de ambiente
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController], // <- Isso é ESSENCIAL!
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
