import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockCode } from './entities/stockcode.entity';
import { StockPrice } from './entities/stockprice.entity';
import { StockTokenDto } from './dto/stock-token.dto';
import axios from 'axios';
import { StockSearchDto } from './dto/stock-search.dto';

@Injectable()
export class StockService {

  private readonly KIS_BASE_URL_DEMO = 'https://openapivts.koreainvestment.com:29443';
  private readonly KIS_WS_URL_DEMO = 'ws://ops.koreainvestment.com:31000';

  constructor(
    @InjectRepository(StockCode)
    private stockCodeRepository: Repository<StockCode>,
    @InjectRepository(StockPrice)
    private stockPriceRepository: Repository<StockPrice>,
  ) {}

  async getKisAuthToken(stockTokenDto: StockTokenDto) {
    const { appKey, appSecretKey } = stockTokenDto;
      try {
        const url = `${this.KIS_BASE_URL_DEMO}/oauth2/tokenP`;
        const response = await axios.post(
            url,
            {
                grant_type: 'client_credentials',
                appkey: appKey,
                appsecret: appSecretKey,
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return {message: 'REST 토큰 발급 성공', data: response.data};
    } catch (error: any) {
        throw new BadRequestException('REST 토큰 발급 실패: ' + (error.response?.data?.message || error.message));
    }
  }

  async searchStock(stockSearchDto: StockSearchDto) {
    const { keyword } = stockSearchDto;
    
    try {
      // 1. 종목명으로 종목 코드 찾기
      const stock = await this.stockCodeRepository.findOne({
        where: { name: keyword },
      });

      if (!stock) {
        throw new BadRequestException('종목을 찾을 수 없습니다.');
      }

      // 2. 종목 코드로 주가 데이터 조회
      const prices = await this.stockPriceRepository.find({
        where: { code: stock.code },
        order: { date: 'DESC' },
      });

      return {message: '종목 조회 성공', data: stock};
    } catch (error: any) {
      throw new BadRequestException('종목 조회 실패: ' + (error.response?.data?.message || error.message));
    }
  }

}
