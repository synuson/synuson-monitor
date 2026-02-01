# SYNUSON Monitor - Security Documentation

## Overview

이 문서는 SYNUSON Monitor의 보안 구현 사항을 설명합니다.

---

## 1. Authentication (인증)

### 1.1 인증 방식
- **NextAuth.js v5** 기반 JWT 인증
- Zabbix 서버를 통한 사용자 검증
- 세션 유효기간: 8시간 (자동 갱신: 1시간)

### 1.2 관련 파일
| 파일 | 설명 |
|------|------|
| `src/lib/auth.config.ts` | NextAuth 설정 |
| `src/lib/auth.ts` | 인증 유틸리티 |
| `src/app/api/auth/[...nextauth]/route.ts` | 인증 API 라우트 |

### 1.3 보안 설정
```typescript
session: {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60,      // 8시간
  updateAge: 60 * 60,        // 1시간마다 갱신
}
```

---

## 2. Authorization (인가)

### 2.1 역할 기반 접근 제어 (RBAC)

| 역할 | 권한 |
|------|------|
| `admin` | 모든 기능 접근, 사용자 관리 |
| `operator` | 모니터링, 설정 변경 |
| `viewer` | 읽기 전용 |

### 2.2 API 접근 제어
```typescript
// src/middleware.ts:218-226
if (pathname.startsWith('/api/users') && request.method !== 'GET') {
  if (token.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }
}
```

### 2.3 라우트 분류

| 분류 | 라우트 | 인증 필요 |
|------|--------|----------|
| Public | `/login`, `/api/auth/*`, `/api/health` | No |
| Protected API | `/api/zabbix/*`, `/api/telegram/*`, `/api/users/*` | Yes |
| Protected Pages | `/`, `/settings/*` | Yes |

---

## 3. Input Validation (입력 검증)

### 3.1 SQL Injection 방어

**탐지 패턴** (`src/lib/validation.ts:6-14`):
```typescript
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
  /(\bUNION\b.*\bSELECT\b)/i,
  /(--|#|\/\*|\*\/)/,
  /(\bOR\b\s+\d+=\d+)/i,
  /(\bAND\b\s+\d+=\d+)/i,
  /(';|";|`)/,
  /(\bEXEC\b|\bEXECUTE\b)/i,
];
```

### 3.2 XSS 방어

**탐지 패턴** (`src/lib/validation.ts:16-23`):
```typescript
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];
```

### 3.3 사용법
```typescript
import { safeString, safeId, hasSqlInjection, hasXss } from '@/lib/validation';

// 안전한 문자열 검증 (SQL/XSS 자동 체크)
const schema = safeString(255);
const result = schema.safeParse(userInput);

// ID 형식 검증 (영숫자, 하이픈, 언더스코어만)
const idSchema = safeId;
const idResult = idSchema.safeParse(userId);
```

---

## 4. Rate Limiting

### 4.1 설정 (`src/middleware.ts:18-22`)

| 유형 | 제한 | 윈도우 | 차단 기간 |
|------|------|--------|----------|
| General | 100 req | 1분 | - |
| API | 60 req | 1분 | - |
| Auth | 5 req | 1분 | 15분 |

### 4.2 Bruteforce 방어
- 인증 실패 5회 초과 시 15분간 차단
- IP 기반 추적
- 응답 헤더로 제한 정보 제공

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
Retry-After: 60
```

### 4.3 프로덕션 권장사항
```typescript
// Redis 기반 분산 Rate Limiting 권장
// 현재는 In-Memory 방식 (단일 인스턴스용)
const rateLimitStore = new Map<string, RateLimitRecord>();
```

---

## 5. CORS (Cross-Origin Resource Sharing)

### 5.1 설정

**환경변수**:
```env
ALLOWED_ORIGINS=https://your-domain.com,https://admin.your-domain.com
```

**기본값** (개발용):
```typescript
const ALLOWED_ORIGINS = ['http://localhost:3000'];
```

### 5.2 응답 헤더
```
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

## 6. Security Headers

### 6.1 적용 헤더 (`src/lib/security.ts:180-200`)

| 헤더 | 값 | 목적 |
|------|-----|------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | HTTPS 강제 |
| X-Frame-Options | SAMEORIGIN | Clickjacking 방지 |
| X-Content-Type-Options | nosniff | MIME 스니핑 방지 |
| X-XSS-Protection | 1; mode=block | 브라우저 XSS 필터 |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer 정보 제한 |
| Permissions-Policy | camera=(), microphone=()... | API 접근 제한 |

### 6.2 Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' ws: wss:;
frame-ancestors 'self';
form-action 'self';
base-uri 'self';
object-src 'none';
```

---

## 7. Cookie Security

### 7.1 세션 쿠키 설정 (`src/lib/auth.config.ts:103-131`)

| 속성 | 개발 | 프로덕션 |
|------|------|----------|
| Name | `next-auth.session-token` | `__Secure-next-auth.session-token` |
| HttpOnly | true | true |
| Secure | false | true |
| SameSite | lax | lax |
| Path | / | / |

### 7.2 CSRF 토큰 쿠키

| 속성 | 개발 | 프로덕션 |
|------|------|----------|
| Name | `next-auth.csrf-token` | `__Host-next-auth.csrf-token` |
| HttpOnly | true | true |
| Secure | false | true |
| SameSite | lax | lax |

---

## 8. SSRF Prevention

### 8.1 차단 호스트 (`src/lib/security.ts:47-56`)
```typescript
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',           // AWS metadata
  'metadata.google.internal',   // GCP metadata
  '::1',
  'internal',
  'kubernetes',
];
```

### 8.2 차단 IP 대역
- `10.0.0.0/8` (Private)
- `172.16.0.0/12` (Private)
- `192.168.0.0/16` (Private)

### 8.3 허용 예외
- `ZABBIX_URL` 환경변수에 설정된 호스트는 허용

---

## 9. Error Handling

### 9.1 에러 노출 방지 (`src/lib/security.ts:128-158`)

**개발 환경**: 상세 에러 메시지 표시
**프로덕션**: 일반화된 에러 메시지만 표시

| 에러 유형 | 프로덕션 메시지 | 코드 |
|----------|----------------|------|
| 인증 실패 | Authentication required | AUTH_REQUIRED |
| 권한 없음 | Access denied | ACCESS_DENIED |
| 리소스 없음 | Resource not found | NOT_FOUND |
| 유효성 오류 | Invalid request | VALIDATION_ERROR |
| 서버 오류 | An error occurred | INTERNAL_ERROR |

---

## 10. Audit Logging

### 10.1 로그 이벤트

| 이벤트 | 기록 정보 |
|--------|----------|
| LOGIN_SUCCESS | userId, role, timestamp |
| LOGIN_FAILED | userId, reason, timestamp |
| LOGIN_ERROR | userId, error, timestamp |

### 10.2 로그 형식
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "action": "LOGIN_SUCCESS",
  "userId": "admin",
  "role": "admin",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### 10.3 사용법
```typescript
import { createAuditLog } from '@/lib/security';

const log = createAuditLog('API_ACCESS', request, {
  userId: 'user123',
  resource: '/api/zabbix/hosts',
  status: 'success',
});
console.log(JSON.stringify(log));
```

---

## 11. Secret Management

### 11.1 필수 환경변수

| 변수 | 설명 | 요구사항 |
|------|------|----------|
| `NEXTAUTH_SECRET` | 세션 암호화 키 | 32자 이상, 랜덤 값 |
| `ZABBIX_URL` | Zabbix API URL | 유효한 URL |
| `ZABBIX_API_TOKEN` | API 토큰 (권장) | - |
| `ZABBIX_USER` | 사용자명 (대안) | 토큰 없을 때 |
| `ZABBIX_PASSWORD` | 비밀번호 (대안) | 토큰 없을 때 |

### 11.2 시크릿 생성
```bash
# NEXTAUTH_SECRET 생성
openssl rand -base64 32

# 또는
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 11.3 검증 (`src/lib/security.ts:241-262`)
```typescript
import { validateSecrets } from '@/lib/security';

const { valid, errors } = validateSecrets();
if (!valid) {
  console.error('Security configuration errors:', errors);
  process.exit(1);
}
```

---

## 12. Security Testing

### 12.1 테스트 실행
```bash
npx tsx src/lib/security.test.ts
```

### 12.2 테스트 항목

| 카테고리 | 테스트 수 | 내용 |
|----------|----------|------|
| SQL Injection | 7 | SELECT, UNION, DROP, 주석, OR 1=1 등 |
| XSS | 6 | script, javascript:, onclick, iframe 등 |
| Sanitization | 4 | 태그 제거, 길이 제한 등 |
| Safe ID | 5 | 형식 검증 |
| Safe String | 4 | 복합 검증 |

### 12.3 의존성 취약점 검사
```bash
npm audit
```

---

## 13. Deployment Checklist

### 13.1 필수 확인 사항

- [ ] `NEXTAUTH_SECRET`이 32자 이상의 랜덤 값인지 확인
- [ ] `NODE_ENV=production` 설정
- [ ] HTTPS 인증서 설치 및 적용
- [ ] `ALLOWED_ORIGINS` 프로덕션 도메인으로 설정
- [ ] Zabbix API Token 방식 사용 (비밀번호 대신)
- [ ] 보안 헤더 적용 확인 (`curl -I https://your-domain.com`)
- [ ] Rate Limiting 동작 확인
- [ ] 에러 메시지가 민감정보를 노출하지 않는지 확인

### 13.2 프로덕션 환경변수 예시
```env
NODE_ENV=production
NEXTAUTH_URL=https://monitor.your-domain.com
NEXTAUTH_SECRET=<32자 이상 랜덤 문자열>
ZABBIX_URL=https://zabbix.your-domain.com/api_jsonrpc.php
ZABBIX_API_TOKEN=<API 토큰>
ALLOWED_ORIGINS=https://monitor.your-domain.com
```

### 13.3 보안 헤더 검증
```bash
curl -I https://your-domain.com | grep -E "(Strict-Transport|X-Frame|X-Content|X-XSS|Referrer|Content-Security)"
```

---

## 14. Known Limitations

### 14.1 현재 제한사항

1. **Rate Limiting**: In-Memory 방식 (단일 인스턴스만 지원)
   - 해결: Redis 기반 구현 필요

2. **Audit Log**: Console 출력만 지원
   - 해결: 데이터베이스 저장 또는 로그 서비스 연동 필요

3. **Session Storage**: JWT만 지원
   - 해결: 필요시 Database Session 구현

4. **CSP**: `unsafe-inline`, `unsafe-eval` 허용
   - 해결: Nonce 기반 CSP 구현 필요

### 14.2 의존성 취약점

현재 알려진 취약점 (2024년 기준):
- Prisma 개발 의존성: 8 moderate
- 런타임 영향 없음, 모니터링 지속

---

## 15. 추가 보안 모듈

### 15.1 Rate Limiter (`src/lib/rate-limiter.ts`)

분산 환경을 위한 Redis 지원:

```typescript
import { createRedisRateLimiter, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const rateLimiter = createRedisRateLimiter(redis);

// 사용
const result = await rateLimiter.check(`api:${clientIp}`, RATE_LIMIT_CONFIGS.api);
if (!result.allowed) {
  return Response.json({ error: 'Rate limited' }, { status: 429 });
}
```

### 15.2 Session Manager (`src/lib/session-manager.ts`)

세션 무효화 지원:

```typescript
import { revokeSession, revokeAllUserSessions, isSessionValid } from '@/lib/session-manager';

// 특정 세션 무효화
revokeSession(sessionId, userId, 'Password changed');

// 사용자의 모든 세션 무효화 (보안 이벤트 시)
revokeAllUserSessions(userId, 'Security incident');

// 세션 유효성 확인
if (!isSessionValid(sessionId, userId, issuedAt)) {
  return Response.json({ error: 'Session revoked' }, { status: 401 });
}
```

### 15.3 API Key 인증 (`src/lib/api-auth.ts`)

프로그래밍 방식 접근 지원:

```typescript
import { registerApiKey, getAuthFromRequest } from '@/lib/api-auth';

// API Key 생성
const { id, key } = registerApiKey('My App', userId, 'viewer', ['read'], 30);
// key = synuson_abc123...

// 요청에서 인증 정보 추출
const auth = await getAuthFromRequest(request);
if (auth.type === 'none') {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 15.4 IP Blocking (`src/lib/security.ts`)

악의적 접근 차단:

```typescript
import { blockIp, unblockIp, isIpBlocked } from '@/lib/security';

// IP 차단 (1시간)
blockIp('192.168.1.100', 'Repeated attack attempts', 60);

// 영구 차단
blockIp('10.0.0.50', 'Malicious activity', 0, true);

// 차단 확인
const { blocked, reason } = isIpBlocked(clientIp);
if (blocked) {
  return Response.json({ error: 'Access denied' }, { status: 403 });
}

// 차단 해제
unblockIp('192.168.1.100');
```

### 15.5 Strong Password Validation (`src/lib/validation.ts`)

강화된 비밀번호 정책:

| 규칙 | 설명 |
|------|------|
| 최소 길이 | 8자 이상 |
| 최대 길이 | 128자 이하 |
| 대문자 | 1개 이상 필수 |
| 소문자 | 1개 이상 필수 |
| 숫자 | 1개 이상 필수 |
| 특수문자 | 1개 이상 필수 (`!@#$%^&*(),.?":{}|<>`) |
| 흔한 패턴 | password, qwerty, admin 등 포함 불가 |
| 반복 문자 | 같은 문자 3개 이상 연속 불가 |

```typescript
import { strongPasswordSchema } from '@/lib/validation';

const result = strongPasswordSchema.safeParse(password);
if (!result.success) {
  console.log(result.error.errors[0].message);
}
```

---

## 16. Incident Response

### 16.1 보안 이슈 발견 시

1. 즉시 해당 기능 비활성화
2. 로그 수집 및 분석
3. 영향 범위 파악
4. 패치 적용
5. 사후 분석 및 문서화

### 16.2 연락처

보안 이슈 리포트: security@your-domain.com

---

## Version History

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2024-01 | 초기 보안 구현 |
| 1.1 | 2024-01 | Rate Limiting, Bruteforce 방어 추가 |
| 1.2 | 2024-01 | CSP, SSRF 방어 강화 |
| 1.3 | 2024-01 | Redis Rate Limiter, Session Manager 추가 |
| 1.4 | 2024-01 | API Key 인증, IP Blocking 추가 |
| 1.5 | 2024-01 | 강화된 비밀번호 정책 적용 |
