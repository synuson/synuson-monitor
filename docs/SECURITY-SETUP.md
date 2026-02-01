# SYNUSON Monitor - Security Setup Guide

빠른 보안 설정 가이드입니다.

## 1. 환경 변수 설정

### 필수 설정

```env
# .env.production

# 인증 설정 (필수)
NEXTAUTH_SECRET=<openssl rand -base64 32 결과>
NEXTAUTH_URL=https://your-domain.com

# Zabbix 연결 (API Token 권장)
ZABBIX_URL=https://zabbix.your-domain.com/api_jsonrpc.php
ZABBIX_API_TOKEN=<Zabbix API Token>

# 또는 사용자/비밀번호 (권장하지 않음)
# ZABBIX_USER=api_user
# ZABBIX_PASSWORD=api_password

# CORS 설정
ALLOWED_ORIGINS=https://your-domain.com

# 프로덕션 모드
NODE_ENV=production
```

### 시크릿 생성 방법

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 2. HTTPS 설정

### Nginx 예시

```nginx
server {
    listen 443 ssl http2;
    server_name monitor.your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    server_name monitor.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 3. 프로덕션 배포 체크리스트

### 배포 전

- [ ] `NEXTAUTH_SECRET` 32자 이상 랜덤 값 설정
- [ ] `NODE_ENV=production` 설정
- [ ] HTTPS 인증서 설치
- [ ] `ALLOWED_ORIGINS` 도메인 설정
- [ ] Zabbix API Token 생성 및 설정

### 배포 후 검증

```bash
# 1. 보안 헤더 확인
curl -I https://your-domain.com

# 예상 출력:
# strict-transport-security: max-age=31536000...
# x-frame-options: SAMEORIGIN
# x-content-type-options: nosniff
# content-security-policy: default-src 'self'...

# 2. 인증 없이 API 접근 시 401 반환 확인
curl https://your-domain.com/api/zabbix?action=hosts
# 예상: {"success":false,"error":"Unauthorized"}

# 3. Rate Limiting 확인 (많은 요청 시 429 반환)
for i in {1..100}; do curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/zabbix; done
# 60회 이후 429 반환

# 4. 로그인 bruteforce 방어 확인
for i in {1..10}; do curl -X POST https://your-domain.com/api/auth/callback/credentials -d '{"username":"test","password":"wrong"}'; done
# 5회 이후 429 반환 및 15분 차단
```

## 4. 비밀번호 정책

다음 조건을 모두 충족해야 합니다:

- 최소 8자 이상
- 대문자 1개 이상
- 소문자 1개 이상
- 숫자 1개 이상
- 특수문자 1개 이상 (`!@#$%^&*(),.?":{}|<>`)
- 흔한 비밀번호 사용 불가
- 연속 같은 문자 3개 이상 불가

**예시:**
- ✅ `MySecure@Pass123`
- ❌ `password123` (흔한 비밀번호)
- ❌ `Aaaa@1234` (연속 문자)
- ❌ `MyPassword1` (특수문자 없음)

## 5. Rate Limiting 설정

| 유형 | 제한 | 윈도우 | 차단 |
|------|------|--------|------|
| 일반 | 100 req | 1분 | - |
| API | 60 req | 1분 | - |
| 인증 | 5 req | 1분 | 15분 |

### Redis 사용 (분산 환경)

```typescript
// src/lib/rate-limiter.ts 참조
import { createRedisRateLimiter } from '@/lib/rate-limiter';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const rateLimiter = createRedisRateLimiter(redis);
```

## 6. API Key 인증 (선택)

프로그래밍 방식 접근을 위한 API Key 지원:

```typescript
import { registerApiKey, validateApiKey } from '@/lib/api-auth';

// API Key 생성
const { id, key } = registerApiKey(
  'My App',           // 이름
  'user123',          // 사용자 ID
  'viewer',           // 역할
  ['read'],           // 권한
  30                  // 만료일 (일)
);

// 사용
curl -H "Authorization: Bearer synuson_xxx..." https://your-domain.com/api/zabbix
```

## 7. 감사 로그

모든 중요 작업이 로깅됩니다:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "action": "LOGIN_SUCCESS",
  "userId": "admin",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### 로그 위치

- 개발: 콘솔 (컬러 출력)
- 프로덕션: JSON 형식 (stdout)

### 외부 로그 서비스 연동

```bash
# CloudWatch (AWS)
docker logs synuson-monitor | aws logs put-log-events ...

# Datadog
docker logs synuson-monitor | datadog-agent ...
```

## 8. 보안 테스트 실행

```bash
cd synuson-monitor
npx tsx src/lib/security.test.ts
```

예상 결과:
```
🔒 Running Security Tests...

--- SQL Injection Detection ---
✅ Detects SELECT injection
✅ Detects UNION injection
...

--- Summary ---
Total: 34 | Passed: 34 | Failed: 0
✅ All security tests passed!
```

## 9. 취약점 스캔

```bash
# npm 의존성 취약점 확인
npm audit

# 자동 수정 (가능한 경우)
npm audit fix

# Docker 이미지 스캔
docker scan synuson-monitor:latest
```

## 10. 문제 해결

### "Unauthorized" 오류

1. `NEXTAUTH_SECRET` 설정 확인
2. 쿠키 도메인 설정 확인
3. HTTPS 사용 여부 확인

### Rate Limit 429 오류

1. 정상적인 사용인 경우: 잠시 후 재시도
2. 차단된 경우: 15분 대기 또는 관리자에게 문의

### CORS 오류

1. `ALLOWED_ORIGINS` 환경변수 확인
2. 요청 Origin과 설정된 Origin 일치 여부 확인
