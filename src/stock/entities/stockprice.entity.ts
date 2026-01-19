import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { StockCode } from './stockcode.entity';

@Entity('stockprice')
@Unique(['code', 'date']) // 한 종목당 하루에 데이터는 하나만 (중복 방지)
export class StockPrice {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index() // 특정 종목의 시세를 모아볼 때 성능 향상
  @Column({ length: 10 })
  code: string;

  @Index() // 날짜별 조회 성능 향상
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'float' })
  open: number;

  @Column({ type: 'float' })
  close: number;

  @Column({ type: 'float' })
  high: number;

  @Column({ type: 'float' })
  low: number;

  @Column({ type: 'bigint' })
  volume: number;

  // MACD 보조지표
  @Column({ type: 'float', nullable: true })
  macd: number; // MACD 값

  @Column({ type: 'float', nullable: true })
  macdSignal: number; // MACD Signal 값

  @Column({ type: 'float', nullable: true })
  macdHistogram: number; // MACD Histogram 값

  // 엘더-레이 보조지표
  @Column({ type: 'float', nullable: true })
  elderBullPower: number; // Bull Power (High - EMA13)

  @Column({ type: 'float', nullable: true })
  elderBearPower: number; // Bear Power (Low - EMA13)

  // 이격도 보조지표
  @Column({ type: 'float', nullable: true })
  disparity5: number; // MA5 대비 이격도 (퍼센트)

  @Column({ type: 'float', nullable: true })
  disparity20: number; // MA20 대비 이격도 (퍼센트)

  @Column({ type: 'float', nullable: true })
  disparity60: number; // MA60 대비 이격도 (퍼센트)

  // RSI 보조지표
  @Column({ type: 'float', nullable: true })
  rsi: number; // RSI 값 (0-100)

  // 이동평균선
  @Column({ type: 'float', nullable: true })
  ma5: number; // 5일 이동평균선

  @Column({ type: 'float', nullable: true })
  ma20: number; // 20일 이동평균선

  @Column({ type: 'float', nullable: true })
  ma60: number; // 60일 이동평균선

  // 볼린저 밴드
  @Column({ type: 'float', nullable: true })
  bbUpper: number; // 볼린저 밴드 상단

  @Column({ type: 'float', nullable: true })
  bbMiddle: number; // 볼린저 밴드 중간선 (MA20)

  @Column({ type: 'float', nullable: true })
  bbLower: number; // 볼린저 밴드 하단

  @Column({ type: 'float', nullable: true })
  bbWidth: number; // 볼린저 밴드 폭 (퍼센트)

  // StockCode 테이블과의 외래키 연결
  @ManyToOne(() => StockCode, (stock: StockCode) => stock.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'code' })
  stock: StockCode;
}