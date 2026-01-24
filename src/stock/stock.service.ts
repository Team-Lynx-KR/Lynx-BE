import { BadRequestException, Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockCode } from './entities/stockcode.entity';
import { StockPrice } from './entities/stockprice.entity';
import { StockFeature } from './entities/stockfeature.entity';
import { StockTokenDto } from './dto/stock-token.dto';
import axios from 'axios';
import { StockSearchDto } from './dto/stock-search.dto';
import { StockSubscribeDto } from './dto/stock-subscribe.dto';
import WebSocket from 'ws';
import { StockGateway } from './stock.gateway';
import type Redis from 'ioredis';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);
  private readonly CACHE_KEY = 'dashboard:top9';
  private readonly CACHE_TTL = 86400; // 24시간 (초)

  private readonly KIS_BASE_URL_DEMO = 'https://openapivts.koreainvestment.com:29443';
  private readonly KIS_WS_URL_DEMO = 'ws://ops.koreainvestment.com:31000';

  private subscriptions = new Map<string, string>();
  private kisClients = new Map<string, WebSocket>();

  constructor(
    @InjectRepository(StockCode)
    private stockCodeRepository: Repository<StockCode>,
    @InjectRepository(StockPrice)
    private stockPriceRepository: Repository<StockPrice>,
    @InjectRepository(StockFeature)
    private stockFeatureRepository: Repository<StockFeature>,
    @Inject(forwardRef(() => StockGateway))
    private stockGateway: StockGateway,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}


  /**
   * KIS API 관련 로직
   */
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

  // 웹소켓 접속키 발급 (WebSocket용)
  async getWebsocketApprovalKey(stockTokenDto: StockTokenDto) {
    const { appKey, appSecretKey } = stockTokenDto;
      try {
        const url = `${this.KIS_BASE_URL_DEMO}/oauth2/Approval`;
        const response = await axios.post(
          url,
          {
            grant_type: 'client_credentials',
            appkey: appKey,
            secretkey: appSecretKey,
          },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
        return { message: '웹소켓 접속키 발급 성공', data: response.data };
      } catch (error: any) {
        throw new BadRequestException('웹소켓 접속키 발급 실패: ' + (error.response?.data?.message || error.message));
      }
    }

  /**
   * 대시보드용 상위 종목 조회 (거래대금 기준)
   * 최근 일주일(7일) 거래대금 합계 기준
   */
  async getTopStocksByTradingAmount(limit: number = 9) {
    try {
      // 최근 일주일(7일) 거래대금 합계 기준으로 상위 종목 조회
      const topStocks = await this.stockPriceRepository
        .createQueryBuilder('price')
        .select([
          'stock.code AS code',
          'stock.name AS name',
          'SUM(price.volume * price.close) AS tradingAmount',
        ])
        .innerJoin('stockcode', 'stock', 'stock.code = price.code')
        .where('price.date >= DATE_SUB((SELECT MAX(date) FROM stockprice), INTERVAL 7 DAY)')
        .andWhere('price.date <= (SELECT MAX(date) FROM stockprice)')
        .groupBy('stock.code')
        .addGroupBy('stock.name')
        .orderBy('SUM(price.volume * price.close)', 'DESC') // 거래대금 합계 = 거래량 * 종가의 합
        .limit(limit)
        .getRawMany();

      return {
        message: '대시보드 상위 종목 조회 성공',
        stocks: topStocks.map(stock => ({
          code: stock.code,
          name: stock.name,
          tradingAmount: Math.round(stock.tradingAmount),
        })),
      };
    } catch (error: any) {
      throw new BadRequestException('대시보드 상위 종목 조회 실패: ' + (error.response?.data?.message || error.message));
    }
  }

  // /**
  //  * 대시보드용 상위 종목 조회 (거래량 기준)
  //  * 최근 일주일(7일) 거래량 합계 기준
  //  */
  // async getTopStocksByVolume(limit: number = 9) {
  //   try {
  //     // 최근 일주일(7일) 거래량 합계 기준으로 상위 종목 조회
  //     const topStocks = await this.stockPriceRepository
  //       .createQueryBuilder('price')
  //       .select([
  //         'stock.name AS name',
  //         'SUM(price.volume) AS volume',
  //       ])
  //       .innerJoin('stockcode', 'stock', 'stock.code = price.code')
  //       .where('price.date >= DATE_SUB((SELECT MAX(date) FROM stockprice), INTERVAL 7 DAY)')
  //       .andWhere('price.date <= (SELECT MAX(date) FROM stockprice)')
  //       .groupBy('stock.code')
  //       .addGroupBy('stock.name')
  //       .orderBy('SUM(price.volume)', 'DESC') // 거래량 합계 기준
  //       .limit(limit)
  //       .getRawMany();

  //     return {
  //       message: '대시보드 상위 종목 조회 성공',
  //       stocks: topStocks.map(stock => ({
  //         name: stock.name,
  //         volume: Math.round(stock.volume),
  //       })),
  //     };
  //   } catch (error: any) {
  //     throw new BadRequestException('대시보드 상위 종목 조회 실패: ' + (error.response?.data?.message || error.message));
  //   }
  // }

  async getDashboardStocks(limit: number = 9) {
    const startTime = performance.now();
    const performanceMetrics = {
      cacheHit: false,
      redisQueryTime: 0,
      jsonParseTime: 0,
      step1_topStocksQuery: 0,
      step2_dailyPricesQuery: 0,
      step3_dataTransformation: 0,
      redisSaveTime: 0,
      totalTime: 0,
      dataSize: {
        stocksCount: 0,
        totalRecords: 0,
        estimatedSizeKB: 0,
      },
    };

    try {
      // Redis 캐시에서 먼저 조회
      const redisStart = performance.now();
      const cachedData = await this.redis.get(this.CACHE_KEY);
      performanceMetrics.redisQueryTime = performance.now() - redisStart;

      if (cachedData) {
        // 캐시 히트 - Redis에 데이터가 있으면 바로 사용 (TTL로 만료 관리)
        const parseStart = performance.now();
        const parsedData = JSON.parse(cachedData);
        performanceMetrics.jsonParseTime = performance.now() - parseStart;
        performanceMetrics.totalTime = performance.now() - startTime;
        performanceMetrics.cacheHit = true;
        performanceMetrics.dataSize.stocksCount = parsedData.stocks.length;
        performanceMetrics.dataSize.totalRecords = parsedData.stocks.reduce(
          (sum: number, stock: any) => sum + stock.dailyPrices.length,
          0,
        );
        performanceMetrics.dataSize.estimatedSizeKB = Math.round(
          (performanceMetrics.dataSize.totalRecords * 330 * 1.2) / 1024,
        );

        this.logger.log(
          `[성능 측정] 대시보드 조회 완료 (Redis 캐시 히트) - ` +
          `총 시간: ${performanceMetrics.totalTime.toFixed(2)}ms | ` +
          `Redis 조회: ${performanceMetrics.redisQueryTime.toFixed(2)}ms | ` +
          `JSON 파싱: ${performanceMetrics.jsonParseTime.toFixed(2)}ms | ` +
          `데이터 크기: ${performanceMetrics.dataSize.totalRecords}개 레코드 (약 ${performanceMetrics.dataSize.estimatedSizeKB}KB)`,
        );

        return {
          message: '대시보드 상위 종목 조회 성공',
          stocks: parsedData.stocks,
        };
      }

      // 캐시 미스 - DB에서 조회
      // 1. 거래대금 기준 TOP 9 종목 조회
      const step1Start = performance.now();
      const topStocksResult = await this.getTopStocksByTradingAmount(limit);
      const topStocks = topStocksResult.stocks;
      performanceMetrics.step1_topStocksQuery = performance.now() - step1Start;

      // 2. 각 종목의 모든 일일 주가 데이터 조회
      const step2Start = performance.now();
      const dailyPricesMap = new Map<string, StockPrice[]>();

      // 각 종목의 일일 데이터 순차 조회
      for (const stock of topStocks) {
        const prices = await this.stockPriceRepository.find({
          where: { code: stock.code },
          order: { date: 'DESC' }, // 날짜 최신순 정렬
        });
        dailyPricesMap.set(stock.code, prices);
      }
      performanceMetrics.step2_dailyPricesQuery = performance.now() - step2Start;

      // 3. 종목 정보와 일일 데이터를 함께 반환
      const step3Start = performance.now();
      const stocksWithPrices = topStocks.map(stock => ({
        code: stock.code,
        name: stock.name,
        tradingAmount: stock.tradingAmount,
        dailyPrices: dailyPricesMap.get(stock.code) || [],
      }));
      performanceMetrics.step3_dataTransformation = performance.now() - step3Start;

      // 4. Redis에 캐시 저장
      const saveStart = performance.now();
      const cacheData = {
        stocks: stocksWithPrices,
        cachedAt: new Date().toISOString(),
      };
      await this.redis.setex(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(cacheData));
      performanceMetrics.redisSaveTime = performance.now() - saveStart;

      // 성능 메트릭 계산
      performanceMetrics.totalTime = performance.now() - startTime;
      performanceMetrics.dataSize.stocksCount = stocksWithPrices.length;
      performanceMetrics.dataSize.totalRecords = stocksWithPrices.reduce(
        (sum, stock) => sum + stock.dailyPrices.length,
        0,
      );
      performanceMetrics.dataSize.estimatedSizeKB = Math.round(
        (performanceMetrics.dataSize.totalRecords * 330 * 1.2) / 1024,
      );

      // 성능 로그 출력
      this.logger.log(
        `[성능 측정] 대시보드 조회 완료 (DB 조회) - ` +
        `총 시간: ${performanceMetrics.totalTime.toFixed(2)}ms | ` +
        `STEP1(TOP9 조회): ${performanceMetrics.step1_topStocksQuery.toFixed(2)}ms | ` +
        `STEP2(일일데이터 조회): ${performanceMetrics.step2_dailyPricesQuery.toFixed(2)}ms | ` +
        `STEP3(데이터 변환): ${performanceMetrics.step3_dataTransformation.toFixed(2)}ms | ` +
        `Redis 저장: ${performanceMetrics.redisSaveTime.toFixed(2)}ms | ` +
        `데이터 크기: ${performanceMetrics.dataSize.totalRecords}개 레코드 (약 ${performanceMetrics.dataSize.estimatedSizeKB}KB)`,
      );

      return {
        message: '대시보드 상위 종목 조회 성공',
        stocks: stocksWithPrices,
      };
    } catch (error: any) {
      performanceMetrics.totalTime = performance.now() - startTime;
      this.logger.error(
        `[성능 측정] 대시보드 조회 실패 - 총 시간: ${performanceMetrics.totalTime.toFixed(2)}ms`,
        error,
      );
      throw new BadRequestException('대시보드 상위 종목 조회 실패: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * 종목 조회 관련 로직
   */
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

      // 3. 종목 코드로 보조지표 및 등락률 데이터 조회
      const features = await this.stockFeatureRepository.find({
        where: { code: stock.code },
        order: { date: 'DESC' },
      });

      return {
        message: '종목 조회 성공',
        stock: stock,
        prices: prices,
        features: features, // 보조지표 및 등락률 데이터 포함
      };
    } catch (error: any) {
      throw new BadRequestException('종목 조회 실패: ' + (error.response?.data?.message || error.message));
    }
  }

  //* 웹소켓 관련 로직
  async subscribeStock(clientId: string, stockSubscribeDto: StockSubscribeDto) {
    const { stockName, approvalKey, appKey, appSecretKey } = stockSubscribeDto;

    try {
      // 1. 종목명으로 종목 코드 찾기
      const stock = await this.stockCodeRepository.findOne({
        where: { name: stockName }
      });

      if(!stock) {
        throw new BadRequestException('종목을 찾을 수 없습니다.');
      }

      if(this.subscriptions.has(clientId)) {
        this.cleanupClient(clientId);
      }
      this.subscriptions.set(clientId, stock.code);

      // 2. KIS 서버와 웹소켓 연결
      const kisClient = new WebSocket(this.KIS_WS_URL_DEMO);
      this.kisClients.set(clientId, kisClient);
      kisClient.on('open', () => {
        const payload = {
          header: {
            approval_key: approvalKey,
            appkey: appKey,
            appsecret: appSecretKey,
            custtype: 'P',
            tr_type: '1',
            'content-type': 'utf-8'
          },
          body: {
            input: {
                tr_id: 'H0STCNT0',
                tr_key: stock.code,
              }
          }
        };
        kisClient.send(JSON.stringify(payload));
      });

      kisClient.on('message', (data) => {
        const response = data.toString();
        
        // PINGPONG 메시지 처리
        if (response.includes('PINGPONG')) {
          kisClient.send(response);
          return;
        }

        // JSON 형식 메시지 처리 (구독 성공 등)
        try {
          const parsedData = JSON.parse(response);
          // 구독 성공 메시지는 무시
          if (parsedData.body?.msg_cd === 'OPSP0000') {
            return;
          }
        } catch (error) {
          // JSON이 아닌 경우 rawdata 파싱 진행
        }

        // Rawdata 파싱 (H0STCNT0 형식: 구분자|TR_ID|데이터개수|데이터1^데이터2^...)
        if (response.includes('|H0STCNT0|')) {
          const parsedData = this.parseStockData(response, stock.code);
          if (parsedData && this.stockGateway) {
            this.stockGateway.emitToClient(clientId, 'stock-data', {
              type: 'realtime_price',
              data: parsedData
            });
          }
        }
      });

    } catch (error: any) {
      throw new BadRequestException('종목 구독 실패: ' + (error.response?.data?.message || error.message));
    }
  }

  cleanupClient(clientId: string) {
    const client = this.kisClients.get(clientId);
    if (client) {
      client.close(); // KIS와 연결 끊기
      this.kisClients.delete(clientId);
      this.subscriptions.delete(clientId);
    }
  }

  /**
   * KIS 웹소켓 rawdata 파싱
   * 형식: 구분자|TR_ID|레코드개수|데이터1^데이터2^...^데이터N
   * 각 레코드는 43개 필드로 구성 (^로 구분)
   * 컬럼 순서 (H0STCNT0):
   * 0: MKSC_SHRN_ISCD (종목코드)
   * 1: STCK_CNTG_HOUR (체결시간)
   * 2: STCK_PRPR (현재가)
   * 7: STCK_OPRC (시가)
   * 30: BSOP_DATE (영업일자)
   */
  private parseStockData(rawData: string, stockCode: string): any[] | null {
    try {
      const parts = rawData.split('|');
      if (parts.length < 4 || parts[1] !== 'H0STCNT0') {
        return null;
      }

      const recordCount = parseInt(parts[2], 10);
      const dataSection = parts[3];
      const allFields = dataSection.split('^');

      // 각 레코드는 43개 필드로 구성
      const fieldsPerRecord = 43;
      const parsedRecords: any[] = [];

      for (let recordIndex = 0; recordIndex < recordCount; recordIndex++) {
        const startIndex = recordIndex * fieldsPerRecord;
        const record = allFields.slice(startIndex, startIndex + fieldsPerRecord);

        if (record.length < fieldsPerRecord) break;

        // 날짜 필드 찾기 (8자리 숫자 형식: YYYYMMDD)
        let dateField = '';
        for (let i = 0; i < record.length; i++) {
          const field = record[i];
          // 8자리 숫자이고 2020년 이후인 경우 날짜로 판단
          if (field && /^\d{8}$/.test(field) && field.startsWith('202')) {
            dateField = field;
            break;
          }
        }
        
        // 날짜를 찾지 못한 경우 인덱스 30 사용 (BSOP_DATE 위치)
        if (!dateField && record[30] && /^\d{8}$/.test(record[30])) {
          dateField = record[30];
        }

        // 필요한 필드만 추출
        const parsed = {
          stockCode: record[0] || stockCode,        // MKSC_SHRN_ISCD (종목코드)
          date: dateField || '',                     // BSOP_DATE (영업일자)
          time: record[1] || '',                     // STCK_CNTG_HOUR (체결시간)
          openPrice: parseInt(record[7] || '0', 10), // STCK_OPRC (시가)
          currentPrice: parseInt(record[2] || '0', 10), // STCK_PRPR (현재가)
        };

        parsedRecords.push(parsed);
      }

      return parsedRecords.length > 0 ? parsedRecords : null;
    } catch (error) {
      return null;
    }
  }
}