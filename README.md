# SYNUSON Monitor

Zabbix 기반 실시간 모니터링 대시보드

## 주요 기능

- 실시간 호스트/서비스 모니터링
- 문제(Problem) 관리 및 ACK
- 심각도별 문제 요약 대시보드
- CPU/메모리 Top N 리소스 모니터링
- HTTP 서비스 헬스체크
- 유지보수(Maintenance) 모드 관리
- Telegram 알림 연동
- 이상 탐지(Anomaly Detection)
- ChatOps (자연어 쿼리)
- 다국어 지원 (한국어/영어)
- 라이트/다크 테마

## 요구사항

- Node.js 18.x 이상
- Zabbix Server 6.0 이상
- (선택) Redis - 캐싱용
- (선택) PostgreSQL - 사용자 관리용

## 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/synuson/synuson-monitor.git
cd synuson-monitor
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 Zabbix 서버 정보를 입력:

```env
# 필수 설정
ZABBIX_URL=http://your-zabbix-server/api_jsonrpc.php
ZABBIX_USER=Admin
ZABBIX_PASSWORD=your_password

# NextAuth 설정 (세션 암호화)
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters
NEXTAUTH_URL=http://localhost:3000
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 환경 변수 설명

| 변수 | 필수 | 설명 |
|------|------|------|
| `ZABBIX_URL` | O | Zabbix API 엔드포인트 |
| `ZABBIX_USER` | O | Zabbix 사용자명 |
| `ZABBIX_PASSWORD` | O | Zabbix 비밀번호 |
| `NEXTAUTH_SECRET` | O | 세션 암호화 키 (32자 이상) |
| `NEXTAUTH_URL` | O | 앱 URL |
| `REDIS_URL` | - | Redis URL (캐싱용) |
| `DATABASE_URL` | - | PostgreSQL URL (사용자 관리용) |

## Zabbix 테스트 환경 (Docker)

Zabbix 서버가 없다면 Docker로 테스트 환경 구축:

```bash
cd zabbix-docker
docker-compose up -d
```

접속 정보:
- Zabbix Web: http://localhost:8080
- 사용자: Admin / zabbix

## 프로덕션 빌드

```bash
npm run build
npm start
```

## Docker 배포

```bash
# 이미지 빌드
docker build -t synuson-monitor .

# 실행
docker run -d \
  -p 3000:3000 \
  -e ZABBIX_URL=http://your-zabbix/api_jsonrpc.php \
  -e ZABBIX_USER=Admin \
  -e ZABBIX_PASSWORD=password \
  -e NEXTAUTH_SECRET=your-secret-key \
  -e NEXTAUTH_URL=http://localhost:3000 \
  synuson-monitor
```

## 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Auth**: NextAuth.js v5
- **Cache**: Redis (선택)
- **DB**: PostgreSQL + Prisma (선택)

## 라이선스

MIT
