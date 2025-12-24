import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { StockCode } from './entities/stockcode.entity';
import { StockPrice } from './entities/stockprice.entity';

@Injectable()
export class StockCollectorService implements OnModuleInit {
  private readonly logger = new Logger(StockCollectorService.name);
  private readonly KIS_BASE_URL_DEMO = 'https://openapivts.koreainvestment.com:29443';

  constructor(
    @InjectRepository(StockCode)
    private readonly stockCodeRepository: Repository<StockCode>,
    @InjectRepository(StockPrice)
    private readonly stockPriceRepository: Repository<StockPrice>,
    private readonly configService: ConfigService,
  ) {}

  // 서버 시작 시 자동으로 종목 마스터 데이터 동기화
  async onModuleInit() {
    this.logger.log('종목 마스터 자동 동기화 시작');
    try {
      await this.syncAllMasters();
      this.logger.log('종목 마스터 자동 동기화 완료');
    } catch (error) {
      this.logger.error('종목 마스터 자동 동기화 실패:', error);
    }
  }

  // 매일 오전 2시에 종목 마스터 데이터 동기화
  @Cron('0 2 * * *', {
    name: 'syncStockMaster',
    timeZone: 'Asia/Seoul',
  })
  async syncMasterScheduler() {
    this.logger.log('스케줄러: 종목 마스터 동기화 시작');
    try {
      await this.syncAllMasters();
      this.logger.log('스케줄러: 종목 마스터 동기화 완료');
    } catch (error) {
      this.logger.error('스케줄러: 종목 마스터 동기화 실패:', error);
    }
  }

  // 매일 오전 3시에 전 종목 500일 일봉 데이터 수집
  @Cron('0 3 * * *', {
    name: 'collectDailyPrices',
    timeZone: 'Asia/Seoul',
  })
  async collectDailyPrices() {
    this.logger.log('일봉 데이터 수집 스케줄러 시작');
    try {
      await this.collectAllStocksDailyPrices();
      this.logger.log('일봉 데이터 수집 스케줄러 완료');
    } catch (error) {
      this.logger.error('일봉 데이터 수집 스케줄러 실패:', error);
    }
  }

  // 전 종목 일봉 데이터 수집 (증분 업데이트: 최신 날짜 이후만, 새 종목은 자동 초기 수집)
  async collectAllStocksDailyPrices() {
    // KIS API 인증 정보 가져오기
    const kisAppKey = this.configService.get<string>('ADMIN_KIS_APP_KEY');
    const kisAppSecretKey = this.configService.get<string>('ADMIN_KIS_APP_SECRET_KEY');

    if (!kisAppKey || !kisAppSecretKey) {
      throw new Error('KIS API 인증 정보가 설정되지 않았습니다. (ADMIN_KIS_APP_KEY, ADMIN_KIS_APP_SECRET_KEY)');
    }

    // KIS API 토큰 발급 (내부용)
    const accessToken = await this.getKisAuthTokenAdmin(kisAppKey, kisAppSecretKey);

    // 모든 종목 조회
    const stocks = await this.stockCodeRepository.find();
    this.logger.log(`총 ${stocks.length}개 종목의 일봉 데이터 수집 시작`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    // 순차 처리: 종목당 순서대로 처리 (속도 대신 안정성/한도 회피 우선)
    for (const stock of stocks) {
      try {
        const result = await this.updateStockDailyPrices(
          stock.code,
          accessToken,
          kisAppKey,
          kisAppSecretKey,
        );

        if (result.skipped) {
          skipCount++;
        } else {
          successCount++;
        }

        // 종목 간 딜레이 (초당 거래건수 제한 회피용)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(
          `종목 ${stock.code} (${stock.name}) 일봉 데이터 수집 실패:`,
          error,
        );
        failCount++;

        // 에러 후에도 잠깐 쉰 다음 다음 종목 진행
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(
      `일봉 데이터 수집 완료: 성공 ${successCount}개, 스킵 ${skipCount}개, 실패 ${failCount}개`,
    );

    return {
      message: '일봉 데이터 수집 완료',
      total: stocks.length,
      success: successCount,
      skipped: skipCount,
      failed: failCount,
    };
  }

  // 전 종목 일봉 데이터 전체 수집 (수동 API 전용: N일 강제 백필)
  async collectAllStocksDailyPricesFull(days: number) {
    // KIS API 인증 정보 가져오기
    const kisAppKey = this.configService.get<string>('ADMIN_KIS_APP_KEY');
    const kisAppSecretKey = this.configService.get<string>('ADMIN_KIS_APP_SECRET_KEY');

    if (!kisAppKey || !kisAppSecretKey) {
      throw new Error('KIS API 인증 정보가 설정되지 않았습니다. (ADMIN_KIS_APP_KEY, ADMIN_KIS_APP_SECRET_KEY)');
    }

    // KIS API 토큰 발급 (내부용)
    const accessToken = await this.getKisAuthTokenAdmin(kisAppKey, kisAppSecretKey);

    // 모든 종목 조회
    const stocks = await this.stockCodeRepository.find();
    this.logger.log(`[전체수집] 총 ${stocks.length}개 종목의 일봉 데이터 ${days}일 수집 시작`);

    let successCount = 0;
    let failCount = 0;

    for (const stock of stocks) {
      try {
        const result = await this.collectStockDailyPricesFull(
          stock.code,
          days,
          accessToken,
          kisAppKey,
          kisAppSecretKey,
        );

        if (result.count > 0) {
          successCount++;
        }

        // 종목 간 딜레이 (초당 거래건수 제한 회피용)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(
          `[전체수집] 종목 ${stock.code} (${stock.name}) 일봉 데이터 수집 실패:`,
          error,
        );
        failCount++;

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.logger.log(
      `[전체수집] 일봉 데이터 수집 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
    );

    return {
      message: '[전체수집] 일봉 데이터 수집 완료',
      total: stocks.length,
      success: successCount,
      failed: failCount,
    };
  }

  // 특정 종목의 일봉 데이터 전체 수집 (수동 전체수집용: N일 강제 백필)
  async collectStockDailyPricesFull(
    stockCode: string,
    days: number,
    accessToken: string,
    appKey: string,
    appSecretKey: string,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 최대 days일 전까지
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const allPriceData: Array<{
      code: string;
      date: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];

    // 100일씩 끊어서 호출
    const segments = Math.ceil(days / 100);
    for (let i = 0; i < segments; i++) {
      const segmentEndDate = new Date(today);
      segmentEndDate.setDate(segmentEndDate.getDate() - i * 100);
      const segmentStartDate = new Date(segmentEndDate);
      segmentStartDate.setDate(segmentStartDate.getDate() - 99);

      // 전역 startDate보다 이전이면 startDate로 제한
      if (segmentStartDate < startDate) {
        segmentStartDate.setTime(startDate.getTime());
      }

      const endDateStr = this.formatDate(segmentEndDate);
      const startDateStr = this.formatDate(segmentStartDate);

      try {
        const priceData = await this.fetchDailyPrices(
          stockCode,
          startDateStr,
          endDateStr,
          accessToken,
          appKey,
          appSecretKey,
        );
        allPriceData.push(...priceData);
      } catch (error) {
        this.logger.warn(
          `[전체수집] 종목 ${stockCode}의 ${startDateStr}~${endDateStr} 구간 데이터 수집 실패:`,
          error,
        );
      }

      // 한 종목 내에서도 각 API 호출 사이에 딜레이
      if (i < segments - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // DB에 저장
    if (allPriceData.length > 0) {
      // 중복 제거
      let uniqueData = Array.from(
        new Map(allPriceData.map(item => [item.date.toISOString().split('T')[0], item])).values(),
      );

      // 날짜 오름차순 정렬
      uniqueData = uniqueData.sort((a, b) => a.date.getTime() - b.date.getTime());

      const startDateStrForLog = this.formatDate(uniqueData[0].date);
      const endDateStrForLog = this.formatDate(uniqueData[uniqueData.length - 1].date);

      const batchSize = 100;
      for (let i = 0; i < uniqueData.length; i += batchSize) {
        const batch = uniqueData.slice(i, i + batchSize);
        await this.stockPriceRepository.upsert(batch, ['code', 'date']);
      }

      this.logger.log(
        `[전체수집] 종목 ${stockCode}: ${startDateStrForLog} ~ ${endDateStrForLog} (${uniqueData.length}일)`,
      );

      return {
        message: `[전체수집] 종목 ${stockCode} 일봉 데이터 수집 완료 - ${startDateStrForLog} ~ ${endDateStrForLog}`,
        count: uniqueData.length,
      };
    }

    this.logger.log(`[전체수집] 종목 ${stockCode}: 수집할 일봉 데이터가 없습니다.`);

    return {
      message: `[전체수집] 종목 ${stockCode} 일봉 데이터 수집 완료 (데이터 없음)`,
      count: 0,
    };
  }

  // 종목의 일봉 데이터 증분 업데이트 (최신 업데이트 날짜 이후만 업데이트 + 새 종목은 자동 초기 수집)
  async updateStockDailyPrices(
    stockCode: string,
    accessToken: string,
    appKey: string,
    appSecretKey: string,
  ) {
    // 해당 종목의 가장 최신 날짜 조회
    const latestPrice = await this.stockPriceRepository.findOne({
      where: { code: stockCode },
      order: { date: 'DESC' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date = new Date(today);
    let isInitial = false;

    if (latestPrice) {
      // 이미 데이터가 있으면: 최신 날짜 다음날부터 오늘까지
      startDate = new Date(latestPrice.date);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);

      // 최신 날짜가 오늘이면 스킵
      if (startDate > today) {
        return {
          message: `종목 ${stockCode} 일봉 데이터 수집 완료 (이미 최신)`,
          count: 0,
          skipped: true,
        };
      }
    } else {
      // 데이터가 없으면: 500일 전부터 오늘까지 (새 종목 자동 초기 수집)
      // 새로운 종목이 상장되어 마스터에 추가되었지만 일봉 데이터가 없는 경우 자동으로 초기 수집
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 499);
      isInitial = true;
      this.logger.log(`종목 ${stockCode}: 새 종목 감지, 500일 초기 수집 시작`);
    }

    const allPriceData: Array<{ // 일봉 데이터 저장 배열
      code: string;
      date: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];

    // 초기 수집인 경우: 100일씩 5번 호출 (초기 수집인지 여부 확인)
    if (isInitial) {
      for (let i = 0; i < 5; i++) {
        const segmentEndDate = new Date(today);
        segmentEndDate.setDate(segmentEndDate.getDate() - i * 100);
        const segmentStartDate = new Date(segmentEndDate);
        segmentStartDate.setDate(segmentStartDate.getDate() - 99);

        const endDateStr = this.formatDate(segmentEndDate);
        const startDateStr = this.formatDate(segmentStartDate);

        try {
          const priceData = await this.fetchDailyPrices(
            stockCode,
            startDateStr,
            endDateStr,
            accessToken,
            appKey,
            appSecretKey,
          );
          allPriceData.push(...priceData);
        } catch (error) {
          this.logger.warn(
            `종목 ${stockCode}의 ${startDateStr}~${endDateStr} 구간 데이터 수집 실패:`,
            error,
          );
        }

        // 한 종목 내에서도 각 API 호출 사이에 딜레이 (초당 거래건수 제한 회피)
        if (i < 4) {
          // 마지막 호출이 아니면 0.5초 대기
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } else {
      // 증분 업데이트: 최신 날짜 다음날부터 오늘까지
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // 100일 이하면 한 번에, 100일 초과면 여러 번 호출
      const segments = Math.ceil(daysDiff / 100);
      for (let i = 0; i < segments; i++) {
        const segmentEndDate = new Date(endDate);
        segmentEndDate.setDate(segmentEndDate.getDate() - i * 100);
        const segmentStartDate = new Date(segmentEndDate);
        segmentStartDate.setDate(segmentStartDate.getDate() - 99);
        
        // startDate보다 이전이면 startDate로 제한
        if (segmentStartDate < startDate) {
          segmentStartDate.setTime(startDate.getTime());
        }

        const endDateStr = this.formatDate(segmentEndDate);
        const startDateStr = this.formatDate(segmentStartDate);

        try {
          const priceData = await this.fetchDailyPrices(
            stockCode,
            startDateStr,
            endDateStr,
            accessToken,
            appKey,
            appSecretKey,
          );
          allPriceData.push(...priceData);
        } catch (error) {
          this.logger.warn(
            `종목 ${stockCode}의 ${startDateStr}~${endDateStr} 구간 데이터 수집 실패:`,
            error,
          );
        }

        // 한 종목 내에서도 각 API 호출 사이에 딜레이 (초당 거래건수 제한 회피)
        if (i < segments - 1) {
          // 마지막 호출이 아니면 0.5초 대기
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // DB에 저장
    if (allPriceData.length > 0) {
      // 중복 제거
      let uniqueData = Array.from(
        new Map(allPriceData.map(item => [item.date.toISOString().split('T')[0], item])).values(),
      );

      // 날짜 오름차순 정렬
      uniqueData = uniqueData.sort((a, b) => a.date.getTime() - b.date.getTime());

      // 실제 수집 구간 (로그용)
      const startDateStrForLog = this.formatDate(uniqueData[0].date);
      const endDateStrForLog = this.formatDate(uniqueData[uniqueData.length - 1].date);

      // 배치로 저장
      const batchSize = 100;
      for (let i = 0; i < uniqueData.length; i += batchSize) {
        const batch = uniqueData.slice(i, i + batchSize);
        await this.stockPriceRepository.upsert(batch, ['code', 'date']);
      }

      this.logger.log(
        `종목 ${stockCode}: ${isInitial ? '초기 수집' : '증분 업데이트'} - ${startDateStrForLog} ~ ${endDateStrForLog} (${uniqueData.length}일)`,
      );

      return {
        message: `종목 ${stockCode} 일봉 데이터 수집 완료 (${isInitial ? '초기 수집' : '증분 업데이트'}) - ${startDateStrForLog} ~ ${endDateStrForLog}`,
        count: uniqueData.length,
        skipped: false,
      };
    }

    // 가져올 데이터가 없을 때 (예: API 응답 비어 있음)
    this.logger.log(`종목 ${stockCode}: 수집할 일봉 데이터가 없습니다.`);

    return {
      message: `종목 ${stockCode} 일봉 데이터 수집 완료 (데이터 없음)`,
      count: 0,
      skipped: false,
    };
  }

  // KIS API로 일봉 데이터 조회 (최대 100일)
  private async fetchDailyPrices(
    stockCode: string,
    startDate: string,
    endDate: string,
    accessToken: string,
    appKey: string,
    appSecretKey: string,
  ): Promise<Array<{ code: string; date: Date; open: number; high: number; low: number; close: number; volume: number }>> {
    const url = `${this.KIS_BASE_URL_DEMO}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`;
    const trId = 'FHKST03010100';

    const response = await axios.get(url, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${accessToken}`,
        'appkey': appKey,
        'appsecret': appSecretKey,
        'tr_id': trId,
      },
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: stockCode,
        FID_INPUT_DATE_1: startDate,
        FID_INPUT_DATE_2: endDate,
        FID_PERIOD_DIV_CODE: 'D',
        FID_ORG_ADJ_PRC: '0',
      },
    });

    if (response.data.rt_cd !== '0') {
      throw new Error(`주가 데이터 조회 실패: ${response.data.msg1}`);
    }

    // 응답 데이터 가공
    const priceData = (response.data.output2 || []).map((item: any) => {
      const dateStr = item.stck_bsop_date; // YYYYMMDD 형식
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1;
      const day = parseInt(dateStr.substring(6, 8), 10);

      return {
        code: stockCode,
        date: new Date(year, month, day),
        open: parseFloat(item.stck_oprc) || 0,
        high: parseFloat(item.stck_hgpr) || 0,
        low: parseFloat(item.stck_lwpr) || 0,
        close: parseFloat(item.stck_clpr) || 0,
        volume: parseInt(item.acml_vol, 10) || 0,
      };
    });

    return priceData;
  }

  // KIS API 인증 토큰 발급 (내부용) (일반 사용자는 stock.service.ts 에서 호출)
  private async getKisAuthTokenAdmin(appKey: string, appSecretKey: string): Promise<string> {
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
        },
      );

      if (!response.data.access_token) {
        throw new Error('KIS API 토큰 발급 실패: access_token이 없습니다.');
      }

      return response.data.access_token;
    } catch (error: any) {
      throw new Error(`KIS API 토큰 발급 실패: ${error.response?.data?.message || error.message}`);
    }
  }

  // 날짜 포맷팅 (YYYYMMDD)
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  // KOSPI와 KOSDAQ 모두 동기화
  async syncAllMasters() {
    const results = await Promise.all([
      this.syncMaster('KOSPI'),
      this.syncMaster('KOSDAQ'),
    ]);

    const totalCount = results.reduce((sum, result) => sum + result.count, 0);
    this.logger.log(`전체 종목 마스터 동기화 완료: 총 ${totalCount}개 종목`);

    return {
      message: '종목 마스터 동기화 완료',
      kospiCount: results[0].count,
      kosdaqCount: results[1].count,
      totalCount,
    };
  }

  // 특정 시장(KOSPI 또는 KOSDAQ)의 종목 마스터 데이터 동기화
  async syncMaster(market: 'KOSPI' | 'KOSDAQ') {
    try {
      this.logger.log(`${market} 종목 마스터 다운로드 시작`);

      // 1. ZIP 파일 다운로드
      const url =
        market === 'KOSPI'
          ? 'https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip'
          : 'https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip';

      const response = await axios.get(url, { responseType: 'arraybuffer' });

      // 2. ZIP 파일 압축 해제
      const zip = new AdmZip(response.data);
      const fileName = market === 'KOSPI' ? 'kospi_code.mst' : 'kosdaq_code.mst';
      const zipEntry = zip.getEntry(fileName);

      if (!zipEntry) {
        throw new Error(`ZIP 파일에서 ${fileName}을(를) 찾을 수 없습니다.`);
      }

      // 3. CP949 인코딩으로 파일 내용 읽기
      const content = iconv.decode(zipEntry.getData(), 'cp949');
      const lines = content.split('\n');

      // 4. MST 파일 파싱 및 DB 저장
      const stockCodes: Array<{ code: string; name: string; marketType: string }> = [];

      for (const line of lines) {
        // 최소 길이 체크 (228자 + 코드/이름 부분)
        if (line.length < 228) continue;

        // 단축코드: 첫 9자
        const code = line.substring(0, 9).trim();

        // 한글명: 21자 이후부터 (전체 길이 - 228)까지
        // Python 코드: rf1_3 = rf1[21:].strip()
        const nameStart = 21;
        const nameEnd = line.length - 228;
        const name = line.substring(nameStart, nameEnd).trim();

        // 유효한 데이터만 추가
        if (code && name) {
          stockCodes.push({
            code,
            name,
            marketType: market,
          });
        }
      }

      // 5. DB에 일괄 저장 (upsert: 있으면 업데이트, 없으면 생성)
      if (stockCodes.length > 0) {
        // 배치로 나눠서 저장 (성능 최적화)
        const batchSize = 1000;
        for (let i = 0; i < stockCodes.length; i += batchSize) {
          const batch = stockCodes.slice(i, i + batchSize);
          await this.stockCodeRepository.upsert(batch, ['code']);
        }
      }

      this.logger.log(
        `${market} 종목 마스터 동기화 완료: ${stockCodes.length}개 종목`,
      );

      return {
        message: `${market} 종목 마스터 동기화 완료`,
        count: stockCodes.length,
      };
    } catch (error) {
      this.logger.error(`${market} 종목 마스터 동기화 실패:`, error);
      throw error;
    }
  }

  // DB에 저장된 종목 마스터 데이터 개수 조회
  async getMasterCount() {
    const [kospiCount, kosdaqCount, totalCount] = await Promise.all([
      this.stockCodeRepository.count({ where: { marketType: 'KOSPI' } }),
      this.stockCodeRepository.count({ where: { marketType: 'KOSDAQ' } }),
      this.stockCodeRepository.count(),
    ]);

    return {
      message: '종목 마스터 데이터 개수 조회 성공',
      kospi: kospiCount,
      kosdaq: kosdaqCount,
      total: totalCount,
    };
  }
}


