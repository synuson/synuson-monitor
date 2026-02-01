# SYNUSON Monitor 빠른 시작 가이드

5분 안에 테스트 환경을 구축하는 방법입니다.

## 필수 조건

- Docker Desktop 설치 완료
- Node.js 18+ 설치 완료

## 1단계: Zabbix 서버 시작 (2분)

```powershell
# 1. zabbix-docker 폴더로 이동
cd C:\Users\User\SYNUSON\synuson-monitor\zabbix-docker

# 2. Docker Compose 실행
docker-compose up -d

# 3. 상태 확인 (모든 컨테이너가 Up 상태가 될 때까지 대기)
docker-compose ps
```

## 2단계: Zabbix 웹 접속 확인 (1분)

1. 브라우저에서 열기: **http://localhost:8080**
2. 로그인:
   - Username: `Admin`
   - Password: `zabbix`

## 3단계: SYNUSON Monitor 시작 (2분)

```powershell
# 1. 프로젝트 폴더로 이동
cd C:\Users\User\SYNUSON\synuson-monitor

# 2. 환경 변수 파일 확인/생성
# .env.local 파일이 없으면 생성

# 3. 개발 서버 시작
npm run dev
```

## 4단계: 대시보드 확인

1. 브라우저에서 열기: **http://localhost:3000**
2. 로그인 (아무 계정으로 가능)
3. 대시보드 확인!

---

## 빠른 참조

| 서비스 | URL | 계정 |
|--------|-----|------|
| SYNUSON Monitor | http://localhost:3000 | 자유 입력 |
| Zabbix Web | http://localhost:8080 | Admin / zabbix |

## 문제 해결

### Docker 컨테이너가 시작되지 않음
```powershell
docker-compose logs
docker-compose down
docker-compose up -d
```

### Zabbix 웹이 접속되지 않음
- 2-3분 대기 후 재시도
- `docker ps`로 컨테이너 상태 확인

### SYNUSON에서 데이터가 안 보임
- `.env.local` 파일 확인
- Zabbix 서버가 실행 중인지 확인

---

자세한 내용은 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 참조
