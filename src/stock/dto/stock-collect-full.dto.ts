import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StockCollectFullDto {
  @ApiProperty({
    description: '수집할 기간 (일 수). 예: 500이면 최근 500일 수집 (최대 2000일 권장)',
    example: 500,
    minimum: 1,
    maximum: 2000,
  })
  @IsInt()
  @Min(1)
  @Max(2000)
  days: number;
}


