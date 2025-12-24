import { Entity, Column, PrimaryColumn, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { StockPrice } from './stockprice.entity';

@Entity('stockcode')
export class StockCode {
  @PrimaryColumn({ length: 10 })
  code: string; // 단축코드 (예: 005930)

  @Index() // 종목명 검색용 인덱스
  @Column({ length: 100 })
  name: string; // 한글명

  @Column({ length: 10 })
  marketType: string; // KOSPI, KOSDAQ

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 시세 데이터와 1:N 관계
  @OneToMany(() => StockPrice, (price: StockPrice) => price.stock)
  prices: StockPrice[];
}