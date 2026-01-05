import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

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

      // 과거 전체 데이터를 등락률 데이터로 변환합니다.
      await queryRunner.query(`
        INSERT INTO stockfeature (date, code, openChangeRate, closeChangeRate, highChangeRate, lowChangeRate, volumeChangeRate)
        SELECT 
          source.date, 
          source.code,
          ((source.open - source.prev_open) / NULLIF(source.prev_open, 0)) * 100 as openChangeRate,
          ((source.close - source.prev_close) / NULLIF(source.prev_close, 0)) * 100 as closeChangeRate,
          ((source.high - source.prev_high) / NULLIF(source.prev_high, 0)) * 100 as highChangeRate,
          ((source.low - source.prev_low) / NULLIF(source.prev_low, 0)) * 100 as lowChangeRate,
          ((source.volume - source.prev_volume) / NULLIF(source.prev_volume, 0)) * 100 as volumeChangeRate
        FROM (
          SELECT 
            date, 
            code, 
            open,
            close, 
            high,
            low,
            volume,
            LAG(open) OVER (PARTITION BY code ORDER BY date) as prev_open,
            LAG(close) OVER (PARTITION BY code ORDER BY date) as prev_close,
            LAG(high) OVER (PARTITION BY code ORDER BY date) as prev_high,
            LAG(low) OVER (PARTITION BY code ORDER BY date) as prev_low,
            LAG(volume) OVER (PARTITION BY code ORDER BY date) as prev_volume
          FROM stockprice
        ) AS source
        WHERE source.prev_close IS NOT NULL
        ON DUPLICATE KEY UPDATE 
          openChangeRate = VALUES(openChangeRate),
          closeChangeRate = VALUES(closeChangeRate),
          highChangeRate = VALUES(highChangeRate),
          lowChangeRate = VALUES(lowChangeRate),
          volumeChangeRate = VALUES(volumeChangeRate);
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
      await queryRunner.query(`
        INSERT INTO stockfeature (date, code, openChangeRate, closeChangeRate, highChangeRate, lowChangeRate, volumeChangeRate)
        SELECT 
          t1.date, 
          t1.code,
          ((t1.open - t2.open) / NULLIF(t2.open, 0)) * 100 as openChangeRate,
          ((t1.close - t2.close) / NULLIF(t2.close, 0)) * 100 as closeChangeRate,
          ((t1.high - t2.high) / NULLIF(t2.high, 0)) * 100 as highChangeRate,
          ((t1.low - t2.low) / NULLIF(t2.low, 0)) * 100 as lowChangeRate,
          ((t1.volume - t2.volume) / NULLIF(t2.volume, 0)) * 100 as volumeChangeRate
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
          volumeChangeRate = VALUES(volumeChangeRate);
      `);

      this.logger.log('일일 등락률 데이터 업데이트 완료');
    } catch (error) {
      this.logger.error('일일 업데이트 중 오류 발생:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

