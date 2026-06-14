import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Public } from '../common/tenant/public.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto, LogoutDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Post('register') async register(@Body() dto: RegisterDto) { return { value: await this.auth.register(dto) }; }
  @Public() @Post('login') async login(@Body() dto: LoginDto) { return { value: await this.auth.login(dto) }; }
  @Public() @Post('refresh') async refresh(@Body() dto: RefreshDto) { return { value: await this.auth.refresh(dto.refreshToken) }; }

  @Post('logout') @HttpCode(204) async logout(@Body() dto: LogoutDto) { await this.auth.logout(dto.refreshToken); }
  @Get('me') async me(@CurrentUser() u: { userId: string }) { return { value: await this.auth.me(u.userId) }; }
}
