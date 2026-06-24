import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, AuthRateLimitGuard],
  exports: [TokenService],
})
export class AuthModule {}
