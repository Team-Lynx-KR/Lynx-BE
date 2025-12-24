import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth (인증)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입', description: '사용자 회원가입을 위해서는 이메일, 비밀번호, 닉네임이 필요합니다.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: '로그인', description: '사용자 로그인을 위해서는 이메일, 비밀번호가 필요합니다. 로그인 성공 시 액세스 토큰과 리프레시 토큰이 발급됩니다.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: '토큰 갱신', description: '리프레시 토큰으로 액세스 토큰 재발급을 위해서는 리프레시 토큰이 필요합니다. 토큰 갱신 성공 시 액세스 토큰과 리프레시 토큰이 발급됩니다.' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }
}