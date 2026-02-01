# SYNUSON Monitor 문제 해결 가이드

## 목차
1. [Docker 관련 문제](#1-docker-관련-문제)
2. [Zabbix 서버 문제](#2-zabbix-서버-문제)
3. [Zabbix Agent 문제](#3-zabbix-agent-문제)
4. [SYNUSON Monitor 문제](#4-synuson-monitor-문제)
5. [네트워크 문제](#5-네트워크-문제)

---

## 1. Docker 관련 문제

### 1.1 Docker Desktop이 시작되지 않음

**증상:** Docker Desktop이 시작되지 않거나 "Docker Desktop stopped" 메시지

**해결방법:**
```powershell
# 1. WSL 상태 확인
wsl --status

# 2. WSL 업데이트
wsl --update

# 3. WSL 재시작
wsl --shutdown

# 4. Docker Desktop 재시작
```

### 1.2 컨테이너 시작 실패

**증상:** `docker-compose up` 실행 시 에러 발생

**해결방법:**
```bash
# 로그 확인
docker-compose logs

# 이전 컨테이너/볼륨 정리
docker-compose down -v
docker system prune -f

# 다시 시작
docker-compose up -d
```

### 1.3 포트 충돌

**증상:** "port is already allocated" 에러

**해결방법:**
```powershell
# 사용 중인 포트 확인
netstat -ano | findstr :8080
netstat -ano | findstr :10051

# 프로세스 종료 (PID 확인 후)
taskkill /PID <PID> /F

# 또는 docker-compose.yml에서 포트 변경
ports:
  - "8081:8080"  # 8080 대신 8081 사용
```

---

## 2. Zabbix 서버 문제

### 2.1 Zabbix 웹 접속 불가

**증상:** http://localhost:8080 접속 시 연결 거부

**확인 및 해결:**
```bash
# 1. 컨테이너 상태 확인
docker ps

# 2. zabbix-web 로그 확인
docker logs zabbix-web

# 3. 컨테이너 재시작
docker-compose restart zabbix-web
```

**일반적인 원인:**
- MySQL 초기화 미완료 (첫 시작 시 2-3분 대기)
- 메모리 부족
- 네트워크 설정 오류

### 2.2 "Database error" 표시

**증상:** Zabbix 웹에서 데이터베이스 에러 메시지

**해결방법:**
```bash
# PostgreSQL 상태 확인
docker logs zabbix-postgres

# PostgreSQL 접속 테스트
docker exec -it zabbix-postgres psql -U zabbix -d zabbix -c "SELECT 1"

# TimescaleDB 확장 확인
docker exec -it zabbix-postgres psql -U zabbix -d zabbix -c "SELECT * FROM pg_extension WHERE extname = 'timescaledb';"

# 전체 재시작
docker-compose down
docker-compose up -d
```

### 2.3 Zabbix 서버 프로세스 중단

**증상:** Zabbix 서버가 자주 재시작됨

**확인:**
```bash
docker logs zabbix-server --tail 100
```

**일반적인 원인:**
- 메모리 부족 → 캐시 설정 감소
- 데이터베이스 연결 문제
- 설정 파일 오류

---

## 3. Zabbix Agent 문제

### 3.1 Agent가 서버에 연결되지 않음

**증상:** Zabbix 웹에서 호스트가 "Unavailable" 상태

**확인 사항:**
1. Agent 서비스 실행 중인지 확인
2. 방화벽 포트 (10050) 열려 있는지 확인
3. Agent 설정 파일의 Server IP 확인

**Windows:**
```powershell
# 서비스 상태 확인
sc query "Zabbix Agent"

# 방화벽 확인
netsh advfirewall firewall show rule name="Zabbix Agent"

# 포트 리스닝 확인
netstat -an | findstr 10050
```

**Linux:**
```bash
# 서비스 상태 확인
systemctl status zabbix-agent

# 포트 리스닝 확인
ss -tlnp | grep 10050

# 방화벽 확인
sudo ufw status
```

### 3.2 연결 테스트

**Zabbix 서버에서 Agent로 테스트:**
```bash
docker exec -it zabbix-server zabbix_get -s <AGENT_IP> -k agent.ping

# 성공 시: 1
# 실패 시: 에러 메시지
```

### 3.3 Agent 설정 문제

**주요 설정 확인:**
```ini
# Windows: C:\Program Files\Zabbix Agent\zabbix_agentd.conf
# Linux: /etc/zabbix/zabbix_agentd.conf

Server=<ZABBIX_SERVER_IP>       # Passive 모드
ServerActive=<ZABBIX_SERVER_IP> # Active 모드
Hostname=<EXACT_HOSTNAME>        # Zabbix에 등록된 이름과 일치
```

---

## 4. SYNUSON Monitor 문제

### 4.1 로그인 후 데이터가 표시되지 않음

**확인 사항:**

1. **.env.local 파일 확인:**
```bash
# 파일 존재 여부
ls -la .env.local

# 내용 확인
cat .env.local
```

2. **Zabbix API 연결 테스트:**
```bash
curl -X POST http://localhost:8080/api_jsonrpc.php \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"apiinfo.version","params":[],"id":1}'
```

3. **브라우저 개발자 도구 확인:**
   - F12 → Network 탭
   - `/api/zabbix` 요청 확인
   - 응답 상태 및 내용 확인

### 4.2 API 연결 에러

**증상:** "Failed to connect to Zabbix" 에러

**해결방법:**
```bash
# 1. Zabbix 서버 접근 가능 확인
curl http://localhost:8080/api_jsonrpc.php

# 2. 환경 변수 확인
cat .env.local

# 3. Next.js 서버 재시작
npm run dev
```

### 4.3 빌드 에러

**증상:** `npm run build` 실패

**해결방법:**
```bash
# 1. node_modules 재설치
rm -rf node_modules
rm package-lock.json
npm install

# 2. 캐시 정리
npm cache clean --force

# 3. 다시 빌드
npm run build
```

---

## 5. 네트워크 문제

### 5.1 Docker 컨테이너 간 통신 불가

**확인:**
```bash
# 네트워크 확인
docker network ls
docker network inspect zabbix-docker_zabbix-network

# 컨테이너 IP 확인
docker inspect zabbix-server | grep IPAddress
```

### 5.2 외부에서 접속 불가

**확인 사항:**
1. 방화벽 설정
2. 포트 포워딩 설정
3. Docker 네트워크 모드

**Windows 방화벽 규칙 추가:**
```powershell
# 인바운드 규칙 추가
netsh advfirewall firewall add rule name="Zabbix Web" dir=in action=allow protocol=TCP localport=8080
netsh advfirewall firewall add rule name="SYNUSON Monitor" dir=in action=allow protocol=TCP localport=3000
```

### 5.3 DNS 해석 문제

**Docker 컨테이너 내 DNS 테스트:**
```bash
docker exec -it zabbix-server ping mysql-server
docker exec -it zabbix-web ping zabbix-server
```

---

## 로그 수집 명령어

문제 보고 시 다음 로그를 수집하세요:

```bash
# Docker 컨테이너 상태
docker ps -a > docker_status.txt

# 각 서비스 로그
docker logs zabbix-server > zabbix_server.log 2>&1
docker logs zabbix-web > zabbix_web.log 2>&1
docker logs zabbix-postgres > postgres.log 2>&1

# Docker Compose 로그
docker-compose logs > docker_compose.log 2>&1

# PostgreSQL 연결 상태
docker exec zabbix-postgres pg_isready -U zabbix -d zabbix
```

---

## 유용한 진단 명령어

```bash
# 시스템 리소스 확인
docker stats

# 디스크 사용량
docker system df

# 네트워크 확인
docker network inspect bridge

# 볼륨 확인
docker volume ls
```
