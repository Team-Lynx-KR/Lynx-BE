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

  // StockCode 테이블과의 외래키 연결
  @ManyToOne(() => StockCode, (stock: StockCode) => stock.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'code' })
  stock: StockCode;
}