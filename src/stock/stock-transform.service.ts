import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  MACD,
  EMA,
  SMA,
  RSI,
  BollingerBands,
} from 'technicalindicators';

@Injectable()
export class StockTransformService {
  private readonly logger = new Logger(StockTransformService.name);

  constructor(private dataSource: DataSource) {}

// 과거 전체 데이터를 등락률 데이터로 변환합니다.
  async transformAllHistory() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log('과거 전체 데이터 변환 시작...');

      // 과거 전체 데이터를 등락률 데이터로 변환합니다. (주가 등락률 + 보조지표 등락률)
      await queryRunner.query(`
        INSERT INTO stockfeature (
          date, code,
          openChangeRate, closeChangeRate, highChangeRate, lowChangeRate, volumeChangeRate,
          macdChangeRate, macdSignalChangeRate, macdHistogramChangeRate,
          elderBullPowerChangeRate, elderBearPowerChangeRate,
          disparity5ChangeRate, disparity20ChangeRate, disparity60ChangeRate,
          rsiChangeRate,
          ma5ChangeRate, ma20ChangeRate, ma60ChangeRate,
          bbUpperChangeRate, bbMiddleChangeRate, bbLowerChangeRate, bbWidthChangeRate
        )
        SELECT 
          source.date, 
          source.code,
          -- 주가 등락률
          ((source.open - source.prev_open) / NULLIF(source.prev_open, 0)) * 100 as openChangeRate,
          ((source.close - source.prev_close) / NULLIF(source.prev_close, 0)) * 100 as closeChangeRate,
          ((source.high - source.prev_high) / NULLIF(source.prev_high, 0)) * 100 as highChangeRate,
          ((source.low - source.prev_low) / NULLIF(source.prev_low, 0)) * 100 as lowChangeRate,
          ((source.volume - source.prev_volume) / NULLIF(source.prev_volume, 0)) * 100 as volumeChangeRate,
          -- 보조지표 등락률
          CASE WHEN source.prev_macd IS NOT NULL AND source.prev_macd != 0 THEN ((source.macd - source.prev_macd) / NULLIF(ABS(source.prev_macd), 0)) * 100 ELSE NULL END as macdChangeRate,
          CASE WHEN source.prev_macdSignal IS NOT NULL AND source.prev_macdSignal != 0 THEN ((source.macdSignal - source.prev_macdSignal) / NULLIF(ABS(source.prev_macdSignal), 0)) * 100 ELSE NULL END as macdSignalChangeRate,
          CASE WHEN source.prev_macdHistogram IS NOT NULL AND source.prev_macdHistogram != 0 THEN ((source.macdHistogram - source.prev_macdHistogram) / NULLIF(ABS(source.prev_macdHistogram), 0)) * 100 ELSE NULL END as macdHistogramChangeRate,
          CASE WHEN source.prev_elderBullPower IS NOT NULL AND source.prev_elderBullPower != 0 THEN ((source.elderBullPower - source.prev_elderBullPower) / NULLIF(ABS(source.prev_elderBullPower), 0)) * 100 ELSE NULL END as elderBullPowerChangeRate,
          CASE WHEN source.prev_elderBearPower IS NOT NULL AND source.prev_elderBearPower != 0 THEN ((source.elderBearPower - source.prev_elderBearPower) / NULLIF(ABS(source.prev_elderBearPower), 0)) * 100 ELSE NULL END as elderBearPowerChangeRate,
          CASE WHEN source.prev_disparity5 IS NOT NULL AND source.prev_disparity5 != 0 THEN ((source.disparity5 - source.prev_disparity5) / NULLIF(source.prev_disparity5, 0)) * 100 ELSE NULL END as disparity5ChangeRate,
          CASE WHEN source.prev_disparity20 IS NOT NULL AND source.prev_disparity20 != 0 THEN ((source.disparity20 - source.prev_disparity20) / NULLIF(source.prev_disparity20, 0)) * 100 ELSE NULL END as disparity20ChangeRate,
          CASE WHEN source.prev_disparity60 IS NOT NULL AND source.prev_disparity60 != 0 THEN ((source.disparity60 - source.prev_disparity60) / NULLIF(source.prev_disparity60, 0)) * 100 ELSE NULL END as disparity60ChangeRate,
          CASE WHEN source.prev_rsi IS NOT NULL AND source.prev_rsi != 0 THEN ((source.rsi - source.prev_rsi) / NULLIF(source.prev_rsi, 0)) * 100 ELSE NULL END as rsiChangeRate,
          CASE WHEN source.prev_ma5 IS NOT NULL AND source.prev_ma5 != 0 THEN ((source.ma5 - source.prev_ma5) / NULLIF(source.prev_ma5, 0)) * 100 ELSE NULL END as ma5ChangeRate,
          CASE WHEN source.prev_ma20 IS NOT NULL AND source.prev_ma20 != 0 THEN ((source.ma20 - source.prev_ma20) / NULLIF(source.prev_ma20, 0)) * 100 ELSE NULL END as ma20ChangeRate,
          CASE WHEN source.prev_ma60 IS NOT NULL AND source.prev_ma60 != 0 THEN ((source.ma60 - source.prev_ma60) / NULLIF(source.prev_ma60, 0)) * 100 ELSE NULL END as ma60ChangeRate,
          CASE WHEN source.prev_bbUpper IS NOT NULL AND source.prev_bbUpper != 0 THEN ((source.bbUpper - source.prev_bbUpper) / NULLIF(source.prev_bbUpper, 0)) * 100 ELSE NULL END as bbUpperChangeRate,
          CASE WHEN source.prev_bbMiddle IS NOT NULL AND source.prev_bbMiddle != 0 THEN ((source.bbMiddle - source.prev_bbMiddle) / NULLIF(source.prev_bbMiddle, 0)) * 100 ELSE NULL END as bbMiddleChangeRate,
          CASE WHEN source.prev_bbLower IS NOT NULL AND source.prev_bbLower != 0 THEN ((source.bbLower - source.prev_bbLower) / NULLIF(source.prev_bbLower, 0)) * 100 ELSE NULL END as bbLowerChangeRate,
          CASE WHEN source.prev_bbWidth IS NOT NULL AND source.prev_bbWidth != 0 THEN ((source.bbWidth - source.prev_bbWidth) / NULLIF(source.prev_bbWidth, 0)) * 100 ELSE NULL END as bbWidthChangeRate
        FROM (
          SELECT 
            date, 
            code, 
            open, close, high, low, volume,
            macd, macdSignal, macdHistogram,
            elderBullPower, elderBearPower,
            disparity5, disparity20, disparity60,
            rsi,
            ma5, ma20, ma60,
            bbUpper, bbMiddle, bbLower, bbWidth,
            LAG(open) OVER (PARTITION BY code ORDER BY date) as prev_open,
            LAG(close) OVER (PARTITION BY code ORDER BY date) as prev_close,
            LAG(high) OVER (PARTITION BY code ORDER BY date) as prev_high,
            LAG(low) OVER (PARTITION BY code ORDER BY date) as prev_low,
            LAG(volume) OVER (PARTITION BY code ORDER BY date) as prev_volume,
            LAG(macd) OVER (PARTITION BY code ORDER BY date) as prev_macd,
            LAG(macdSignal) OVER (PARTITION BY code ORDER BY date) as prev_macdSignal,
            LAG(macdHistogram) OVER (PARTITION BY code ORDER BY date) as prev_macdHistogram,
            LAG(elderBullPower) OVER (PARTITION BY code ORDER BY date) as prev_elderBullPower,
            LAG(elderBearPower) OVER (PARTITION BY code ORDER BY date) as prev_elderBearPower,
            LAG(disparity5) OVER (PARTITION BY code ORDER BY date) as prev_disparity5,
            LAG(disparity20) OVER (PARTITION BY code ORDER BY date) as prev_disparity20,
            LAG(disparity60) OVER (PARTITION BY code ORDER BY date) as prev_disparity60,
            LAG(rsi) OVER (PARTITION BY code ORDER BY date) as prev_rsi,
            LAG(ma5) OVER (PARTITION BY code ORDER BY date) as prev_ma5,
            LAG(ma20) OVER (PARTITION BY code ORDER BY date) as prev_ma20,
            LAG(ma60) OVER (PARTITION BY code ORDER BY date) as prev_ma60,
            LAG(bbUpper) OVER (PARTITION BY code ORDER BY date) as prev_bbUpper,
            LAG(bbMiddle) OVER (PARTITION BY code ORDER BY date) as prev_bbMiddle,
            LAG(bbLower) OVER (PARTITION BY code ORDER BY date) as prev_bbLower,
            LAG(bbWidth) OVER (PARTITION BY code ORDER BY date) as prev_bbWidth
          FROM stockprice
        ) AS source
        WHERE source.prev_close IS NOT NULL
        ON DUPLICATE KEY UPDATE 
          openChangeRate = VALUES(openChangeRate),
          closeChangeRate = VALUES(closeChangeRate),
          highChangeRate = VALUES(highChangeRate),
          lowChangeRate = VALUES(lowChangeRate),
          volumeChangeRate = VALUES(volumeChangeRate),
          macdChangeRate = VALUES(macdChangeRate),
          macdSignalChangeRate = VALUES(macdSignalChangeRate),
          macdHistogramChangeRate = VALUES(macdHistogramChangeRate),
          elderBullPowerChangeRate = VALUES(elderBullPowerChangeRate),
          elderBearPowerChangeRate = VALUES(elderBearPowerChangeRate),
          disparity5ChangeRate = VALUES(disparity5ChangeRate),
          disparity20ChangeRate = VALUES(disparity20ChangeRate),
          disparity60ChangeRate = VALUES(disparity60ChangeRate),
          rsiChangeRate = VALUES(rsiChangeRate),
          ma5ChangeRate = VALUES(ma5ChangeRate),
          ma20ChangeRate = VALUES(ma20ChangeRate),
          ma60ChangeRate = VALUES(ma60ChangeRate),
          bbUpperChangeRate = VALUES(bbUpperChangeRate),
          bbMiddleChangeRate = VALUES(bbMiddleChangeRate),
          bbLowerChangeRate = VALUES(bbLowerChangeRate),
          bbWidthChangeRate = VALUES(bbWidthChangeRate);
      `);

      this.logger.log('과거 전체 데이터 변환 완료');
    } catch (error) {
      this.logger.error('전체 변환 중 오류 발생:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

// 일봉 데이터 수집 완료 후 등락률 데이터를 계산하여 삽입합니다.
  async transformDailyFeatures() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log('일일 등락률 데이터 업데이트 시작...');

      // 오늘 수집된 데이터(t1)와 이전의 가장 최근 데이터(t2)를 조인하여 계산
      // 주가 등락률 + 보조지표 등락률 계산
      await queryRunner.query(`
        INSERT INTO stockfeature (
          date, code,
          openChangeRate, closeChangeRate, highChangeRate, lowChangeRate, volumeChangeRate,
          macdChangeRate, macdSignalChangeRate, macdHistogramChangeRate,
          elderBullPowerChangeRate, elderBearPowerChangeRate,
          disparity5ChangeRate, disparity20ChangeRate, disparity60ChangeRate,
          rsiChangeRate,
          ma5ChangeRate, ma20ChangeRate, ma60ChangeRate,
          bbUpperChangeRate, bbMiddleChangeRate, bbLowerChangeRate, bbWidthChangeRate
        )
        SELECT 
          t1.date, 
          t1.code,
          -- 주가 등락률
          ((t1.open - t2.open) / NULLIF(t2.open, 0)) * 100 as openChangeRate,
          ((t1.close - t2.close) / NULLIF(t2.close, 0)) * 100 as closeChangeRate,
          ((t1.high - t2.high) / NULLIF(t2.high, 0)) * 100 as highChangeRate,
          ((t1.low - t2.low) / NULLIF(t2.low, 0)) * 100 as lowChangeRate,
          ((t1.volume - t2.volume) / NULLIF(t2.volume, 0)) * 100 as volumeChangeRate,
          -- 보조지표 등락률
          CASE WHEN t2.macd IS NOT NULL AND t2.macd != 0 THEN ((t1.macd - t2.macd) / NULLIF(ABS(t2.macd), 0)) * 100 ELSE NULL END as macdChangeRate,
          CASE WHEN t2.macdSignal IS NOT NULL AND t2.macdSignal != 0 THEN ((t1.macdSignal - t2.macdSignal) / NULLIF(ABS(t2.macdSignal), 0)) * 100 ELSE NULL END as macdSignalChangeRate,
          CASE WHEN t2.macdHistogram IS NOT NULL AND t2.macdHistogram != 0 THEN ((t1.macdHistogram - t2.macdHistogram) / NULLIF(ABS(t2.macdHistogram), 0)) * 100 ELSE NULL END as macdHistogramChangeRate,
          CASE WHEN t2.elderBullPower IS NOT NULL AND t2.elderBullPower != 0 THEN ((t1.elderBullPower - t2.elderBullPower) / NULLIF(ABS(t2.elderBullPower), 0)) * 100 ELSE NULL END as elderBullPowerChangeRate,
          CASE WHEN t2.elderBearPower IS NOT NULL AND t2.elderBearPower != 0 THEN ((t1.elderBearPower - t2.elderBearPower) / NULLIF(ABS(t2.elderBearPower), 0)) * 100 ELSE NULL END as elderBearPowerChangeRate,
          CASE WHEN t2.disparity5 IS NOT NULL AND t2.disparity5 != 0 THEN ((t1.disparity5 - t2.disparity5) / NULLIF(t2.disparity5, 0)) * 100 ELSE NULL END as disparity5ChangeRate,
          CASE WHEN t2.disparity20 IS NOT NULL AND t2.disparity20 != 0 THEN ((t1.disparity20 - t2.disparity20) / NULLIF(t2.disparity20, 0)) * 100 ELSE NULL END as disparity20ChangeRate,
          CASE WHEN t2.disparity60 IS NOT NULL AND t2.disparity60 != 0 THEN ((t1.disparity60 - t2.disparity60) / NULLIF(t2.disparity60, 0)) * 100 ELSE NULL END as disparity60ChangeRate,
          CASE WHEN t2.rsi IS NOT NULL AND t2.rsi != 0 THEN ((t1.rsi - t2.rsi) / NULLIF(t2.rsi, 0)) * 100 ELSE NULL END as rsiChangeRate,
          CASE WHEN t2.ma5 IS NOT NULL AND t2.ma5 != 0 THEN ((t1.ma5 - t2.ma5) / NULLIF(t2.ma5, 0)) * 100 ELSE NULL END as ma5ChangeRate,
          CASE WHEN t2.ma20 IS NOT NULL AND t2.ma20 != 0 THEN ((t1.ma20 - t2.ma20) / NULLIF(t2.ma20, 0)) * 100 ELSE NULL END as ma20ChangeRate,
          CASE WHEN t2.ma60 IS NOT NULL AND t2.ma60 != 0 THEN ((t1.ma60 - t2.ma60) / NULLIF(t2.ma60, 0)) * 100 ELSE NULL END as ma60ChangeRate,
          CASE WHEN t2.bbUpper IS NOT NULL AND t2.bbUpper != 0 THEN ((t1.bbUpper - t2.bbUpper) / NULLIF(t2.bbUpper, 0)) * 100 ELSE NULL END as bbUpperChangeRate,
          CASE WHEN t2.bbMiddle IS NOT NULL AND t2.bbMiddle != 0 THEN ((t1.bbMiddle - t2.bbMiddle) / NULLIF(t2.bbMiddle, 0)) * 100 ELSE NULL END as bbMiddleChangeRate,
          CASE WHEN t2.bbLower IS NOT NULL AND t2.bbLower != 0 THEN ((t1.bbLower - t2.bbLower) / NULLIF(t2.bbLower, 0)) * 100 ELSE NULL END as bbLowerChangeRate,
          CASE WHEN t2.bbWidth IS NOT NULL AND t2.bbWidth != 0 THEN ((t1.bbWidth - t2.bbWidth) / NULLIF(t2.bbWidth, 0)) * 100 ELSE NULL END as bbWidthChangeRate
        FROM stockprice t1
        JOIN stockprice t2 ON t1.code = t2.code
        WHERE t1.date = CURDATE() -- 오늘 데이터 기준
          AND t2.date = (
            SELECT MAX(date) 
            FROM stockprice 
            WHERE date < CURDATE() AND code = t1.code
          )
        ON DUPLICATE KEY UPDATE 
          openChangeRate = VALUES(openChangeRate),
          closeChangeRate = VALUES(closeChangeRate),
          highChangeRate = VALUES(highChangeRate),
          lowChangeRate = VALUES(lowChangeRate),
          volumeChangeRate = VALUES(volumeChangeRate),
          macdChangeRate = VALUES(macdChangeRate),
          macdSignalChangeRate = VALUES(macdSignalChangeRate),
          macdHistogramChangeRate = VALUES(macdHistogramChangeRate),
          elderBullPowerChangeRate = VALUES(elderBullPowerChangeRate),
          elderBearPowerChangeRate = VALUES(elderBearPowerChangeRate),
          disparity5ChangeRate = VALUES(disparity5ChangeRate),
          disparity20ChangeRate = VALUES(disparity20ChangeRate),
          disparity60ChangeRate = VALUES(disparity60ChangeRate),
          rsiChangeRate = VALUES(rsiChangeRate),
          ma5ChangeRate = VALUES(ma5ChangeRate),
          ma20ChangeRate = VALUES(ma20ChangeRate),
          ma60ChangeRate = VALUES(ma60ChangeRate),
          bbUpperChangeRate = VALUES(bbUpperChangeRate),
          bbMiddleChangeRate = VALUES(bbMiddleChangeRate),
          bbLowerChangeRate = VALUES(bbLowerChangeRate),
          bbWidthChangeRate = VALUES(bbWidthChangeRate);
      `);

      this.logger.log('일일 등락률 데이터 업데이트 완료');
    } catch (error) {
      this.logger.error('일일 업데이트 중 오류 발생:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 오늘 수집된 데이터의 보조지표를 계산합니다.
  async calculateDailyIndicators() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log('일일 보조지표 계산 시작...');

      // 최근 10일 데이터 중 보조지표가 없는 데이터만 조회 (ma5가 NULL인 경우 보조지표가 계산되지 않은 것으로 간주)
      const stocksToCalculate = await queryRunner.query(`
        SELECT DISTINCT code, date
        FROM stockprice 
        WHERE ma5 IS NULL
          AND date >= DATE_SUB(CURDATE(), INTERVAL 10 DAY)
        ORDER BY date DESC, code
      `);

      this.logger.log(`보조지표 계산 대상: ${stocksToCalculate.length}개 데이터 (최근 10일)`);

      let successCount = 0;
      let failCount = 0;

      for (const stock of stocksToCalculate) {
        try {
          // 날짜 문자열을 Date 객체로 변환
          const targetDate = stock.date instanceof Date ? stock.date : new Date(stock.date);
          await this.calculateIndicatorsForStock(queryRunner, stock.code, targetDate);
          successCount++;
          
          // 진행 상황 로그 (3000개마다)
          if ((successCount + failCount) % 3000 === 0) {
            this.logger.log(`진행 상황: ${successCount + failCount}/${stocksToCalculate.length} 처리 완료`);
          }
        } catch (error) {
          this.logger.error(`종목 ${stock.code} 날짜 ${stock.date} 보조지표 계산 실패:`, error);
          failCount++;
        }
      }

      const message = `일일 보조지표 계산 완료: 성공 ${successCount}개, 실패 ${failCount}개`;
      this.logger.log(message);
      return { message, successCount, failCount };
    } catch (error) {
      this.logger.error('일일 보조지표 계산 중 오류 발생:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 전 종목의 전체 보조지표를 계산합니다.
  async calculateAllIndicators() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log('전체 보조지표 계산 시작...');

      // 보조지표가 없는 모든 데이터 조회 (ma5가 NULL인 경우 보조지표가 계산되지 않은 것으로 간주)
      const stocksToCalculate = await queryRunner.query(`
        SELECT DISTINCT code, date
        FROM stockprice 
        WHERE ma5 IS NULL
        ORDER BY code, date
      `);

      this.logger.log(`보조지표 계산 대상: ${stocksToCalculate.length}개 데이터`);

      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;

      for (const stock of stocksToCalculate) {
        try {
          // 날짜 문자열을 Date 객체로 변환
          const targetDate = stock.date instanceof Date ? stock.date : new Date(stock.date);
          const dateStr = targetDate.toISOString().split('T')[0];
          
          // 보조지표 계산 전 상태 확인
          const beforeCalculation = await queryRunner.query(`
            SELECT ma5 FROM stockprice WHERE code = ? AND date = ?
          `, [stock.code, dateStr]);
          
          // 보조지표 계산 시도
          await this.calculateIndicatorsForStock(queryRunner, stock.code, targetDate);
          
          // 계산 후 확인하여 실제로 계산되었는지 체크
          const afterCalculation = await queryRunner.query(`
            SELECT ma5 FROM stockprice WHERE code = ? AND date = ?
          `, [stock.code, dateStr]);
          
          if (afterCalculation[0]?.ma5 === null && beforeCalculation[0]?.ma5 === null) {
            // 데이터 부족으로 스킵된 경우
            skipCount++;
          } else {
            successCount++;
          }
          
          // 진행 상황 로그 (3000개마다)
          if ((successCount + failCount + skipCount) % 3000 === 0) {
            this.logger.log(`진행 상황: ${successCount + failCount + skipCount}/${stocksToCalculate.length} 처리 완료 (성공: ${successCount}, 실패: ${failCount}, 스킵: ${skipCount})`);
          }
        } catch (error) {
          this.logger.error(`종목 ${stock.code} 날짜 ${stock.date} 보조지표 계산 실패:`, error);
          failCount++;
        }
      }

      const message = `전체 보조지표 계산 완료: 성공 ${successCount}개, 실패 ${failCount}개, 스킵 ${skipCount}개`;
      this.logger.log(message);
      return { message, successCount, failCount, skipCount };
    } catch (error) {
      this.logger.error('전체 보조지표 계산 중 오류 발생:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 특정 종목의 특정 날짜에 대한 보조지표를 계산합니다.
  private async calculateIndicatorsForStock(
    queryRunner: any,
    code: string,
    targetDate: Date,
  ) {
    // 최대 60일 + 26일(MACD) = 86일 정도의 데이터가 필요
    const requiredDays = 100;
    
    // 날짜를 YYYY-MM-DD 형식으로 변환
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // 해당 날짜까지의 주가 데이터 조회 (최대 requiredDays일)
    const prices = await queryRunner.query(`
      SELECT date, open, high, low, close, volume
      FROM stockprice
      WHERE code = ? AND date <= ?
      ORDER BY date DESC
      LIMIT ?
    `, [code, dateStr, requiredDays]);

    // 최소 5일 데이터는 필요 (MA5 계산을 위해)
    if (prices.length < 5) {
      // 데이터가 너무 부족하면 스킵
      return;
    }

    // 날짜 오름차순으로 정렬 (오래된 것부터)
    prices.reverse();

    const closes = prices.map((p: any) => p.close);
    const highs = prices.map((p: any) => p.high);
    const lows = prices.map((p: any) => p.low);
    const opens = prices.map((p: any) => p.open);

    const targetIndex = prices.length - 1; // 마지막 날짜가 타겟 날짜

    // 이동평균선 계산 (MA5, MA20, MA60) - 데이터가 충분한 경우에만 계산
    const ma5Values = closes.length >= 5 ? SMA.calculate({ period: 5, values: closes }) : [];
    const ma20Values = closes.length >= 20 ? SMA.calculate({ period: 20, values: closes }) : [];
    const ma60Values = closes.length >= 60 ? SMA.calculate({ period: 60, values: closes }) : [];

    const ma5 = ma5Values.length > 0 ? ma5Values[ma5Values.length - 1] : null;
    const ma20 = ma20Values.length > 0 ? ma20Values[ma20Values.length - 1] : null;
    const ma60 = ma60Values.length > 0 ? ma60Values[ma60Values.length - 1] : null;

    // 이격도 계산 (현재가 / 이동평균선 * 100)
    const currentPrice = closes[targetIndex];
    const disparity5 = ma5 ? ((currentPrice / ma5) * 100) : null;
    const disparity20 = ma20 ? ((currentPrice / ma20) * 100) : null;
    const disparity60 = ma60 ? ((currentPrice / ma60) * 100) : null;

    // RSI 계산 (14일) - 최소 14일 데이터 필요
    const rsiValues = closes.length >= 14 ? RSI.calculate({ period: 14, values: closes }) : [];
    const rsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;

    // MACD 계산 (12, 26, 9) - 최소 26일 데이터 필요
    let macd: number | null = null;
    let macdSignal: number | null = null;
    let macdHistogram: number | null = null;
    if (closes.length >= 26) {
      const macdInput = {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        values: closes,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      };
      const macdResults = MACD.calculate(macdInput);
      const macdResult = macdResults.length > 0 ? macdResults[macdResults.length - 1] : null;
      macd = macdResult?.MACD || null;
      macdSignal = macdResult?.signal || null;
      macdHistogram = macdResult?.histogram || null;
    }

    // 볼린저 밴드 계산 (20일, 표준편차 2) - 최소 20일 데이터 필요
    let bbUpper: number | null = null;
    let bbMiddle: number | null = null;
    let bbLower: number | null = null;
    let bbWidth: number | null = null;
    if (closes.length >= 20) {
      const bbInput = {
        period: 20,
        stdDev: 2,
        values: closes,
      };
      const bbResults = BollingerBands.calculate(bbInput);
      const bbResult = bbResults.length > 0 ? bbResults[bbResults.length - 1] : null;
      bbUpper = bbResult?.upper || null;
      bbMiddle = bbResult?.middle || null;
      bbLower = bbResult?.lower || null;
      bbWidth = bbMiddle && bbLower && bbUpper ? (((bbUpper - bbLower) / bbMiddle) * 100) : null;
    }

    // 엘더-레이 계산 (EMA13 사용) - 최소 13일 데이터 필요
    let elderBullPower: number | null = null;
    let elderBearPower: number | null = null;
    if (closes.length >= 13) {
      const ema13Values = EMA.calculate({ period: 13, values: closes });
      const ema13 = ema13Values.length > 0 ? ema13Values[ema13Values.length - 1] : null;
      elderBullPower = ema13 ? (highs[targetIndex] - ema13) : null;
      elderBearPower = ema13 ? (lows[targetIndex] - ema13) : null;
    }

    // stockprice 테이블에 보조지표 저장
    await queryRunner.query(`
      UPDATE stockprice
      SET
        macd = ?,
        macdSignal = ?,
        macdHistogram = ?,
        elderBullPower = ?,
        elderBearPower = ?,
        disparity5 = ?,
        disparity20 = ?,
        disparity60 = ?,
        rsi = ?,
        ma5 = ?,
        ma20 = ?,
        ma60 = ?,
        bbUpper = ?,
        bbMiddle = ?,
        bbLower = ?,
        bbWidth = ?
      WHERE code = ? AND date = ?
    `, [
      macd,
      macdSignal,
      macdHistogram,
      elderBullPower,
      elderBearPower,
      disparity5,
      disparity20,
      disparity60,
      rsi,
      ma5,
      ma20,
      ma60,
      bbUpper,
      bbMiddle,
      bbLower,
      bbWidth,
      code,
      dateStr,
    ]);
  }
}

