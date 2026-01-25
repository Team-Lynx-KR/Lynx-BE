import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockCollectorService } from './stock-collector.service';
import { StockTokenDto } from './dto/stock-token.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StockSearchDto } from './dto/stock-search.dto';
import { StockTransformService } from './stock-transform.service';

@ApiTags('Stock (주식)')
@Controller('stock')
export class StockController {
    constructor(
        private readonly stockService: StockService,
        private readonly stockCollectorService: StockCollectorService,
        private readonly stockTransformService: StockTransformService,
    ) {}

    @Post('kis/restapi/auth/token')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'KIS REST API 인증 토큰 발급', description: 'KIS REST API 인증 토큰 발급을 위해서는 JWT 토큰과 앱 키, 앱 시크릿 키가 필요합니다.' })
    @ApiBody({ type: StockTokenDto })
    async getKisAuthToken(@Body() stockTokenDto: StockTokenDto) {
        return await this.stockService.getKisAuthToken(stockTokenDto);
    }

    @Post('kis/websocket/auth/approval')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'KIS WebSocket 접속키 발급', description: 'KIS WebSocket 연결을 위한 접속키(approval_key) 발급을 위해서는 JWT 토큰과 앱 키, 앱 시크릿 키가 필요합니다.' })
    @ApiBody({ type: StockTokenDto })
    async getWebsocketApprovalKey(@Body() stockTokenDto: StockTokenDto) {
        return await this.stockService.getWebsocketApprovalKey(stockTokenDto);
    }

    @Get('dashboard')
    @ApiOperation({ 
        summary: '대시보드 상위 종목 조회', 
        description: '최근 일주일(7일) 거래대금 기준 TOP 9 종목을 조회하고, 각 종목의 모든 일일 주가 데이터를 함께 반환합니다. Redis 캐시에서 조회하며, 캐시 미스 시 DB에서 조회 후 캐시에 저장합니다. (일반적으로 매일 오전 6시에 자동 갱신됩니다)\n\n⚠️ 주의: 응답 데이터가 매우 크므로 Swagger에서 직접 실행하지 마세요. 실제 API 호출 시 전체 데이터가 반환됩니다.' 
    })
    @ApiResponse({
        status: 200,
        description: '거래대금 기준 TOP 9 종목과 각 종목의 모든 일일 주가 데이터를 반환합니다.',
        schema: {
            example: {
                message: '대시보드 상위 종목 조회 성공',
                stocks: [
                    {
                        code: '005930',
                        name: '삼성전자',
                        tradingAmount: 10391769626900,
                        dailyPrices: [
                            {
                                id: 800931,
                                code: '005930',
                                date: '2025-12-26',
                                open: 112400,
                                close: 117000,
                                high: 117000,
                                low: 112400,
                                volume: '34018174',
                                macd: 3055.01,
                                macdSignal: 2461.76,
                                macdHistogram: 593.249,
                                elderBullPower: 7852.87,
                                elderBearPower: 3252.87,
                                disparity5: 105.14,
                                disparity20: 109.127,
                                disparity60: 115.895,
                                rsi: 68.17,
                                ma5: 111280,
                                ma20: 107215,
                                ma60: 100953,
                                bbUpper: 114843,
                                bbMiddle: 107215,
                                bbLower: 99587.3,
                                bbWidth: 14.2287,
                            },
                            {
                                id: 551519,
                                code: '005930',
                                date: '2025-12-24',
                                open: 112400,
                                close: 111100,
                                high: 112400,
                                low: 110900,
                                volume: '12492939',
                                macd: 2526.99,
                                macdSignal: 2313.16,
                                macdHistogram: 213.83,
                                elderBullPower: 4561.68,
                                elderBearPower: 3061.68,
                                disparity5: 101.554,
                                disparity20: 104.28,
                                disparity60: 110.615,
                                rsi: 61.0,
                                ma5: 109400,
                                ma20: 106540,
                                ma60: 100438,
                                bbUpper: 112862,
                                bbMiddle: 106540,
                                bbLower: 100218,
                                bbWidth: 11.8681,
                            },
                            {
                                id: 551518,
                                code: '005930',
                                date: '2025-12-23',
                                open: 110900,
                                close: 111500,
                                high: 112500,
                                low: 110400,
                                volume: '20419187',
                                macd: 2417.26,
                                macdSignal: 2259.72,
                                macdHistogram: 157.541,
                                elderBullPower: 5205.3,
                                elderBearPower: 3105.3,
                                disparity5: 102.519,
                                disparity20: 105.065,
                                disparity60: 111.489,
                                rsi: 61.88,
                                ma5: 108760,
                                ma20: 106125,
                                ma60: 100010,
                                bbUpper: 112283,
                                bbMiddle: 106125,
                                bbLower: 99967.1,
                                bbWidth: 11.605,
                            },
                        ],
                    },
                    {
                        code: '000660',
                        name: 'SK하이닉스',
                        tradingAmount: 4500000000000,
                        dailyPrices: [
                            {
                                id: 800932,
                                code: '000660',
                                date: '2025-12-26',
                                open: 145000,
                                close: 146500,
                                high: 148000,
                                low: 144000,
                                volume: '15000000',
                                macd: 2500.5,
                                macdSignal: 2300.2,
                                macdHistogram: 200.3,
                                elderBullPower: 5000.0,
                                elderBearPower: 3000.0,
                                disparity5: 102.5,
                                disparity20: 105.0,
                                disparity60: 110.0,
                                rsi: 65.5,
                                ma5: 144000,
                                ma20: 142000,
                                ma60: 138000,
                                bbUpper: 148000,
                                bbMiddle: 142000,
                                bbLower: 136000,
                                bbWidth: 8.45,
                            },
                        ],
                    },
                ],
            },
        },
    })
    async getDashboardStocks() {
        return await this.stockService.getDashboardStocks(9);
    }

    @Post('dashboard/cache/refresh')
    @ApiOperation({ summary: '대시보드 캐시 수동 갱신 (관리자용)', description: '대시보드 데이터를 DB에서 조회하여 Redis 캐시를 수동으로 갱신합니다. (일반적으로 매일 오전 6시에 자동 실행됩니다)' })
    async refreshDashboardCache() {
        return await this.stockService.refreshDashboardCache(9);
    }

    @Post('search')
    @ApiOperation({ summary: '종목 검색', description: '종목명으로 종목을 검색합니다. 종목 검색 성공 시 종목 정보가 반환됩니다.' })
    @ApiBody({ type: StockSearchDto })
    async searchStock(@Body() stockSearchDto: StockSearchDto) {
        return await this.stockService.searchStock(stockSearchDto);
    }

    @Post('master/sync')
    @ApiOperation({ summary: '종목 마스터 데이터 수동 동기화 (관리자용)', description: 'KOSPI와 KOSDAQ 종목 마스터 데이터를 수동으로 동기화합니다. (일반적으로 매일 오전 2시에 자동 실행됩니다)' })
    async syncMaster() {
        return await this.stockCollectorService.syncAllMasters();
    }

    // @Get('master/count')
    // @UseGuards(AuthGuard('jwt'))
    // @ApiBearerAuth('JWT-auth')
    // @ApiOperation({ summary: '종목 마스터 데이터 개수 조회 (관리자용)', description: 'DB에 저장된 종목 마스터 데이터 개수를 조회합니다.' })
    // async getMasterCount() {
    //     return await this.stockCollectorService.getMasterCount();
    // }

    @Post('price/collect')
    @ApiOperation({ summary: '일봉 데이터 수동 수집 (증분 업데이트) (관리자용)', description: '전 종목의 일봉 데이터를 증분 업데이트 방식으로 수집합니다. (일반적으로 매일 오전 3시에 자동 실행됩니다)' })
    async collectDailyPrices() {
        return await this.stockCollectorService.collectAllStocksDailyPrices();
    }

    // @Post('price/collect-full')
    // @UseGuards(AuthGuard('jwt'))
    // @ApiBearerAuth('JWT-auth')
    // @ApiOperation({ summary: '일봉 데이터 전체 수동 수집 (관리자용)', description: '전 종목의 일봉 데이터를 지정한 일 수 만큼 강제로 전체 수집합니다. (예: 500일, 1000일 등)' })
    // @ApiBody({ type: StockCollectFullDto })
    // async collectDailyPricesFull(@Body() dto: StockCollectFullDto) {
    //     return await this.stockCollectorService.collectAllStocksDailyPricesFull(dto.days);
    // }

    @Post('feature/transform')
    @ApiOperation({ summary: '등락률 데이터 계산 (관리자용)', description: '과거 전체 데이터를 등락률 데이터로 변환합니다. (일반적으로 매일 일봉 데이터 수집 후 자동 실행됩니다)' })
    async transformFeatures() {
        return await this.stockTransformService.transformAllHistory();
    }

    // @Post('indicator/calculate-daily')
    // @ApiOperation({ summary: '보조지표 일일 계산 (관리자용)', description: '오늘 수집된 주가 데이터의 보조지표를 계산합니다. (일반적으로 매일 일봉 데이터 수집 후 자동 실행됩니다)' })
    // async calculateDailyIndicators() {
    //     return await this.stockTransformService.calculateDailyIndicators();
    // }

    @Post('indicator/calculate-all')
    @ApiOperation({ summary: '보조지표 전체 계산 (관리자용)', description: '전 종목의 모든 날짜에 대한 보조지표를 계산합니다. 초기 설정 시 또는 데이터 재계산이 필요할 때 사용합니다.' })
    async calculateAllIndicators() {
        return await this.stockTransformService.calculateAllIndicators();
    }

}
