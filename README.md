# Lynx Backend

한국 주식 데이터 수집, 분석 및 실시간 주가 제공을 위한 NestJS 기반 백엔드 서버입니다.

## 목차

- [기술 스택](#기술-스택)
- [주요 기능](#주요-기능)
- [프로젝트 구조](#프로젝트-구조)
- [환경 설정](#환경-설정)
- [실행 방법](#실행-방법)
- [API 문서](#api-문서)
- [배포](#배포)
- [성능 최적화](#성능-최적화)

## 기술 스택

### Backend
- **NestJS** - Node.js 프레임워크
- **TypeScript** - 타입 안정성
- **TypeORM** - ORM
- **Socket.IO** - WebSocket 실시간 통신

### Database & Cache
- **MySQL 8.0** - 주식 데이터 저장
- **Redis 7** - 캐싱 및 세션 관리

### Infrastructure
- **Docker & Docker Compose** - 컨테이너화
- **Nginx** - 리버스 프록시 및 HTTPS
- **Certbot** - Let's Encrypt SSL 인증서
- **GitHub Actions** - CI/CD 자동화

### External APIs
- **KIS API** - 한국투자증권 API (주가 데이터 수집)
- **네이버 검색 API** - 종목별 뉴스 조회

## 주요 기능

### 1. 주식 데이터 수집 및 관리
- **종목 마스터 데이터 동기화**: KOSPI/KOSDAQ 종목 정보 자동 수집
- **일봉 데이터 수집**: 전 종목 일일 주가 데이터 수집 (증분 업데이트)
- **보조지표 계산**: MACD, RSI, 볼린저 밴드, 이동평균선 등 자동 계산
- **스케줄러 기반 자동화**: 매일 자동으로 데이터 수집 및 갱신

### 2. 대시보드 API
- **거래대금 TOP 9 종목 조회**: 최근 일주일 거래대금 기준 상위 종목
- **Redis 캐싱**: 조회 성능 최적화 (약 98.8% 성능 개선)
- **자동 캐시 갱신**: 매일 오전 6시 자동 갱신

### 3. 실시간 주가 (WebSocket)
- **KIS WebSocket 연동**: 실시간 주가 데이터 스트리밍
- **종목 구독/해제**: 클라이언트별 종목 구독 관리

### 4. 인증 및 보안
- **JWT 인증**: Access Token + Refresh Token
- **bcrypt 비밀번호 암호화**
- **HTTPS**: Nginx 리버스 프록시를 통한 SSL/TLS

### 5. 종목 검색 및 뉴스
- **종목 검색**: 종목명으로 검색
- **종목별 뉴스**: 네이버 검색 API를 통한 최신 뉴스 조회

## 프로젝트 구조

```
src/
├── auth/              # 인증 모듈 (회원가입, 로그인, JWT)
├── users/             # 사용자 모듈
├── stock/              # 주식 모듈
│   ├── entities/       # 엔티티 (StockCode, StockPrice, StockFeature)
│   ├── dto/            # DTO
│   ├── stock.controller.ts      # API 엔드포인트
│   ├── stock.service.ts         # 비즈니스 로직
│   ├── stock-collector.service.ts  # 데이터 수집 서비스
│   ├── stock-transform.service.ts  # 보조지표 계산 서비스
│   └── stock.gateway.ts        # WebSocket 게이트웨이
├── redis/              # Redis 모듈
└── main.ts             # 애플리케이션 진입점
```

## 환경 설정

### 필수 환경 변수

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Database
DB_HOST=lynx-mysql
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=your_database
MYSQL_ROOT_PASSWORD=your_root_password

# Redis
REDIS_HOST=lynx-redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_key

# KIS API (한국투자증권)
ADMIN_KIS_APP_KEY=your_kis_app_key
ADMIN_KIS_APP_SECRET_KEY=your_kis_secret_key

# 네이버 검색 API
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# Docker
DOCKER_USERNAME=your_docker_username

# Server
PORT=3000
NODE_ENV=production
```

## 🚀 실행 방법

### 개발 환경

```bash
# 의존성 설치
npm install

# Docker Compose로 서비스 시작
docker compose -f docker-compose.dev.yml up -d

# 개발 서버 실행 (자동 재시작)
npm run start:dev
```

개발 환경에서는 다음 서비스들이 실행됩니다:
- MySQL (포트 3306)
- Redis (포트 6379)
- Redis Commander (포트 8081) - Redis 관리 UI
- Backend (포트 3000)

### 프로덕션 환경

```bash
# Docker Compose로 서비스 시작
docker compose -f docker-compose.prod.yml up -d
```

프로덕션 환경에서는 다음 서비스들이 실행됩니다:
- MySQL (포트 3306)
- Redis (포트 6379)
- Backend (내부 포트 3000)
- Nginx (포트 80, 443) - 리버스 프록시

## API 문서

서버 실행 후 Swagger 문서에 접근할 수 있습니다:

- **개발 환경**: `http://localhost:3000/api`
- **프로덕션 환경**: 비공개

### 주요 API 엔드포인트

#### 인증
- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인
- `POST /auth/refresh` - 토큰 갱신

#### 주식 (이용자용)
- `GET /stock/dashboard` - 대시보드 상위 종목 조회 (거래대금 TOP 9)
- `POST /stock/search` - 종목 검색
- `POST /stock/news` - 종목별 뉴스 조회
- `POST /stock/kis/restapi/auth/token` - KIS REST API 토큰 발급 (JWT 필요)
- `POST /stock/kis/websocket/auth/approval` - KIS WebSocket 접속키 발급 (JWT 필요)

#### 주식 (관리자용)
- `POST /stock/dashboard/cache/refresh` - 대시보드 캐시 수동 갱신
- `POST /stock/master/sync` - 종목 마스터 데이터 수동 동기화
- `POST /stock/price/collect` - 일봉 데이터 수동 수집
- `POST /stock/feature/transform` - 등락률 데이터 계산
- `POST /stock/indicator/calculate-all` - 보조지표 전체 계산

### WebSocket

- **연결**: `ws://localhost:3000` (개발) / `wss://lostparty.com` (프로덕션)
- **이벤트**: `subscribe-stock` - 종목 구독
- **응답 이벤트**: `stock-data` - 실시간 주가 데이터

## 배포

### GitHub Actions 자동 배포

`dev` 브랜치에 푸시하면 자동으로 배포됩니다:

1. Docker 이미지 빌드 및 푸시
2. EC2에 파일 복사
3. 서비스 재시작
4. SSL 인증서 자동 갱신 확인

### 수동 배포

```bash
# EC2에 SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 프로젝트 디렉토리로 이동
cd /home/ubuntu

# 최신 이미지 받기
sudo docker pull your-docker-username/lynx-backend:dev

# 서비스 재시작
sudo docker compose up -d --force-recreate
```

### HTTPS 설정

초기 SSL 인증서 발급 (수동, 한 번만, 이메일은 자기 이메일):

```bash
sudo docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d lostparty.com \
  -d www.lostparty.com

# Nginx 설정 변경
sudo sed -i 's/nginx.conf.init/nginx.conf/g' docker-compose.yml
sudo docker compose restart lynx-nginx
```

인증서 갱신은 GitHub Actions에서 자동으로 처리됩니다.

## 성능 최적화

### Redis 캐싱

대시보드 API는 Redis 캐싱을 통해 성능을 크게 개선했습니다:

- **DB 조회**: 약 3,437ms
- **Redis 캐시 조회**: 약 40ms
- **성능 개선**: 약 **98.8%** (약 86배 빠름)

### 캐시 전략

- **캐시 키**: `dashboard:top9`
- **TTL**: 24시간 (86,400초)
- **자동 갱신**: 매일 오전 6시 (한국 시간)
- **캐시 미스 처리**: DB 조회 후 자동 캐싱

### 스케줄러

다음 작업들이 자동으로 실행됩니다:

- **오전 2시**: 종목 마스터 데이터 동기화
- **오전 3시**: 일봉 데이터 수집 (증분 업데이트)
- **오전 6시**: 대시보드 캐시 갱신

모든 스케줄러는 한국 시간대(Asia/Seoul)로 설정되어 있습니다.

## 데이터 구조

### StockCode (종목 마스터)
- 종목 코드, 종목명, 시장 구분 등

### StockPrice (일봉 데이터)
- 날짜, 시가, 종가, 고가, 저가, 거래량 등

### StockFeature (보조지표 및 등락률)
- MACD, RSI, 볼린저 밴드, 이동평균선, 등락률 등

## 보안

- **HTTPS**: Nginx를 통한 SSL/TLS 암호화
- **JWT**: 토큰 기반 인증
- **비밀번호 암호화**: bcrypt 해싱
- **CORS**: 설정 가능한 CORS 정책
- **환경 변수**: 민감 정보는 환경 변수로 관리
