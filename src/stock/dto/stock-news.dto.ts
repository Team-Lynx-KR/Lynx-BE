import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StockNewsDto {
  @ApiProperty({ description: '종목명 또는 종목 코드', example: '삼성전자' })
  @IsString()
  @IsNotEmpty()
  keyword: string;
}

