import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'JWT 가드 테스트', description: 'JWT 토큰이 필요한 엔드포인트 테스트' })
  getTest(@Req() req: any): { message: string; user: any } {
    return {
      message: 'JWT 토큰 검증 성공',
      user: req.user,
    };
  }
}
