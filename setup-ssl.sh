#!/bin/bash

# SSL 인증서 발급 스크립트

echo "🔐 SSL 인증서 발급 시작..."

# 1. Nginx 시작 (HTTP만)
echo "📦 Nginx 시작 중..."
docker compose up -d lynx-nginx

# 2. 대기
echo "⏳ 대기 중..."
sleep 5

# 3. 인증서 발급
echo "📜 인증서 발급 중..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email inseok1999@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d lostparty.com \
  -d www.lostparty.com

# 4. Nginx 재시작
echo "🔄 Nginx 재시작 중..."
docker compose restart lynx-nginx

echo "✅ 완료! https://lostparty.com 으로 접속하세요."
