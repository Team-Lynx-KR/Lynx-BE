import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StockSearchDto {
  @ApiProperty({ description: '종목명', example: '삼성전자' })
  @IsString()
  @IsNotEmpty()
  keyword: string; // 종목명
}