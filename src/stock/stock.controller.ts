import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockCollectorService } from './stock-collector.service';
import { StockTokenDto } from './dto/stock-token.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
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
        description: '가장 최신 수집된 날짜 기준으로 거래량 TOP 9와 거래대금 TOP 9 종목을 조회합니다. 각 종목의 종목명과 전일 거래량/거래대금을 반환합니다. 프론트엔드에서 종목명을 사용하여 상세 조회 API를 호출할 수 있습니다.' 
    })
    async getDashboardStocks() {
        return await this.stockService.getDashboardStocks(9);
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
