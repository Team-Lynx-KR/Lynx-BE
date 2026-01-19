import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  /** 
   * JWT 토큰 검증 성공 시 실행
   * 최적화: Payload에 이미 필요한 정보가 포함되어 있으므로 DB 조회 없이 바로 반환
   * 이렇게 하면 매 요청마다 DB 조회가 발생하지 않아 성능이 크게 향상됩니다.
   */
  async validate(payload: { id: number; email: string; nickname: string }) {
    // Payload에 포함된 정보를 그대로 반환 (DB 조회 제거)
    return { 
      id: payload.id, 
      email: payload.email, 
      nickname: payload.nickname 
    };
  }
}