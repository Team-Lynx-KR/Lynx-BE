import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService) {}

  async register(registerDto: RegisterDto) {
    const { email, password, nickname } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('이미 존재하는 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      nickname,
    });

    return {message: '회원가입 성공', user: {
      email: user.email,
      nickname: user.nickname,
    }};
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('존재하지 않는 이메일입니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    /** 비밀번호 검증 성공 시 JWT 토큰 발급 */
    if (user && isPasswordValid) {
      const payload = { email: user.email };
      const token = this.jwtService.sign(payload);
      return { message: '로그인 성공', token };
    }
    throw new BadRequestException('로그인 실패');
  }
}