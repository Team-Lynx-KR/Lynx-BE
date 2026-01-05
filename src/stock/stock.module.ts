import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { StockCollectorService } from './stock-collector.service';
import { StockTransformService } from './stock-transform.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockCode } from './entities/stockcode.entity';
import { StockPrice } from './entities/stockprice.entity';
import { StockFeature } from './entities/stockfeature.entity';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([StockCode, StockPrice, StockFeature]),
    ],
    controllers: [StockController],
    providers: [StockService, StockCollectorService, StockTransformService],
    exports: [StockService, StockCollectorService, StockTransformService],
})
export class StockModule {}

