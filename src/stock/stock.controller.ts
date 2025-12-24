import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockCollectorService } from './stock-collector.service';
import { StockTokenDto } from './dto/stock-token.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StockSearchDto } from './dto/stock-search.dto';
import { StockCollectFullDto } from './dto/stock-collect-full.dto';

@ApiTags('Stock (주식)')
@Controller('stock')
export class StockController {
    constructor(
        private readonly stockService: StockService,
        private readonly stockCollectorService: StockCollectorService,
    ) {}

    @Post('kis/restapi/auth/token')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'KIS REST API 인증 토큰 발급', description: 'KIS REST API 인증 토큰 발급을 위해서는 JWT 토큰과 앱 키, 앱 시크릿 키가 필요합니다.' })
    @ApiBody({ type: StockTokenDto })
    async getKisAuthToken(@Body() stockTokenDto: StockTokenDto) {
        return await this.stockService.getKisAuthToken(stockTokenDto);
    }

    @Post('search')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: '종목 검색', description: '종목 검색을 위해서는 JWT 토큰과 종목명이 필요합니다. 종목 검색 성공 시 종목 정보가 반환됩니다.' })
    @ApiBody({ type: StockSearchDto })
    async searchStock(@Body() stockSearchDto: StockSearchDto) {
        return await this.stockService.searchStock(stockSearchDto);
    }

    @Post('master/sync')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: '종목 마스터 데이터 수동 동기화', description: 'KOSPI와 KOSDAQ 종목 마스터 데이터를 수동으로 동기화합니다. (일반적으로 매일 오전 2시에 자동 실행됩니다)' })
    async syncMaster() {
        return await this.stockCollectorService.syncAllMasters();
    }

    @Get('master/count')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: '종목 마스터 데이터 개수 조회', description: 'DB에 저장된 종목 마스터 데이터 개수를 조회합니다.' })
    async getMasterCount() {
        return await this.stockCollectorService.getMasterCount();
    }

    @Post('price/collect')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: '일봉 데이터 수동 수집 (증분 업데이트)', description: '전 종목의 일봉 데이터를 증분 업데이트 방식으로 수집합니다. (일반적으로 매일 오전 3시에 자동 실행됩니다)' })
    async collectDailyPrices() {
        return await this.stockCollectorService.collectAllStocksDailyPrices();
    }

    @Post('price/collect-full')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: '일봉 데이터 전체 수동 수집', description: '전 종목의 일봉 데이터를 지정한 일 수 만큼 강제로 전체 수집합니다. (예: 500일, 1000일 등)' })
    @ApiBody({ type: StockCollectFullDto })
    async collectDailyPricesFull(@Body() dto: StockCollectFullDto) {
        return await this.stockCollectorService.collectAllStocksDailyPricesFull(dto.days);
    }
}
