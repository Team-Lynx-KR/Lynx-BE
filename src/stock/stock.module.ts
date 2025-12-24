import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { StockCollectorService } from './stock-collector.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockCode } from './entities/stockcode.entity';
import { StockPrice } from './entities/stockprice.entity';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([StockCode, StockPrice]),
    ],
    controllers: [StockController],
    providers: [StockService, StockCollectorService],
    exports: [StockService, StockCollectorService],
})
export class StockModule {}

