import { Entity, Column, PrimaryGeneratedColumn, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { StockCode } from './stockcode.entity';

@Entity('stockfeature')
@Unique(['code', 'date']) // 한 종목당 하루에 데이터는 하나만 (중복 방지)
export class StockFeature {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index() // 특정 종목의 시세를 모아볼 때 성능 향상
  @Column({ length: 10 })
  code: string; // 단축코드 (예: 005930)

  @Index() // 날짜별 조회 성능 향상
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'float' })
  openChangeRate: number; // 전날 대비 시가 등락률 (퍼센트)

  @Column({ type: 'float' })
  closeChangeRate: number; // 전날 대비 종가 등락률 (퍼센트)

  @Column({ type: 'float' })
  highChangeRate: number; // 전날 대비 고가 등락률 (퍼센트)

  @Column({ type: 'float' })
  lowChangeRate: number; // 전날 대비 저가 등락률 (퍼센트)

  @Column({ type: 'float', nullable: true })
  volumeChangeRate: number; // 전날 대비 거래량 변화율 (퍼센트)

  // 보조지표 등락률 (AI 학습용)
  // MACD 등락률
  @Column({ type: 'float', nullable: true })
  macdChangeRate: number; // MACD 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  macdSignalChangeRate: number; // MACD Signal 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  macdHistogramChangeRate: number; // MACD Histogram 전날 대비 변화율 (퍼센트)

  // 엘더-레이 등락률
  @Column({ type: 'float', nullable: true })
  elderBullPowerChangeRate: number; // Bull Power 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  elderBearPowerChangeRate: number; // Bear Power 전날 대비 변화율 (퍼센트)

  // 이격도 등락률
  @Column({ type: 'float', nullable: true })
  disparity5ChangeRate: number; // 이격도5 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  disparity20ChangeRate: number; // 이격도20 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  disparity60ChangeRate: number; // 이격도60 전날 대비 변화율 (퍼센트)

  // RSI 등락률
  @Column({ type: 'float', nullable: true })
  rsiChangeRate: number; // RSI 전날 대비 변화율 (퍼센트)

  // 이동평균선 등락률
  @Column({ type: 'float', nullable: true })
  ma5ChangeRate: number; // MA5 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  ma20ChangeRate: number; // MA20 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  ma60ChangeRate: number; // MA60 전날 대비 변화율 (퍼센트)

  // 볼린저 밴드 등락률
  @Column({ type: 'float', nullable: true })
  bbUpperChangeRate: number; // 볼린저 밴드 상단 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  bbMiddleChangeRate: number; // 볼린저 밴드 중간선 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  bbLowerChangeRate: number; // 볼린저 밴드 하단 전날 대비 변화율 (퍼센트)

  @Column({ type: 'float', nullable: true })
  bbWidthChangeRate: number; // 볼린저 밴드 폭 전날 대비 변화율 (퍼센트)

  // StockCode 테이블과의 외래키 연결
  @ManyToOne(() => StockCode, (stock: StockCode) => stock.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'code' })
  stock: StockCode;
}