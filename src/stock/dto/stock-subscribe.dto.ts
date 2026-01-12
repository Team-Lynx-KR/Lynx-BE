import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StockSubscribeDto {
  @ApiProperty({
    description: '종목명 (예: 삼성전자)',
    example: '삼성전자',
  })
  @IsString()
  @IsNotEmpty()
  stockName: string;

  @ApiProperty({
    description: 'KIS 웹소켓 접속키 (Approval Key) - /stock/kis/websocket/auth/approval 엔드포인트로 발급받은 approval_key',
    example: 'your-approval-key-here',
  })
  @IsString()
  @IsNotEmpty()
  approvalKey: string;

  @ApiProperty({
    description: 'KIS App Key',
    example: 'your-app-key-here',
  })
  @IsString()
  @IsNotEmpty()
  appKey: string;

  @ApiProperty({
    description: 'KIS App Secret Key',
    example: 'your-app-secret-key-here',
  })
  @IsString()
  @IsNotEmpty()
  appSecretKey: string;
}