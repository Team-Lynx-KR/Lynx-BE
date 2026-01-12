import { IsString, IsNotEmpty } from 'class-validator';

export class StockSubscribeDto {
  @IsString()
  @IsNotEmpty()
  stockName: string;

  @IsString()
  @IsNotEmpty()
  approvalKey: string;

  @IsString()
  @IsNotEmpty()
  appKey: string;

  @IsString()
  @IsNotEmpty()
  appSecretKey: string;
}