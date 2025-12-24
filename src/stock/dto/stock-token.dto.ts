import { IsString, IsNotEmpty } from 'class-validator';

export class StockTokenDto {
  @IsString()
  @IsNotEmpty()
  appKey: string;

  @IsString()
  @IsNotEmpty()
  appSecretKey: string;
}
