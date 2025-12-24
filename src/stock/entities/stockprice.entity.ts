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
  high: number;

  @Column({ type: 'float' })
  low: number;

  @Column({ type: 'float' })
  close: number;

  @Column({ type: 'bigint' })
  volume: number;

  // StockCode 테이블과의 외래키 연결
  @ManyToOne(() => StockCode, (stock: StockCode) => stock.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'code' })
  stock: StockCode;
}