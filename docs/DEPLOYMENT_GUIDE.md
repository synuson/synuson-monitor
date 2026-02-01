# SYNUSON Monitor 테스트 환경 구축 가이드

## 목차

1. [개요](#1-개요)
2. [사전 요구사항](#2-사전-요구사항)
3. [Zabbix 서버 구축 (Docker)](#3-zabbix-서버-구축-docker)
4. [Zabbix 초기 설정](#4-zabbix-초기-설정)
5. [Zabbix Agent 설치](#5-zabbix-agent-설치)
6. [SYNUSON Monitor 연동](#6-synuson-monitor-연동)
7. [테스트 및 검증](#7-테스트-및-검증)
8. [문제 해결](#8-문제-해결)
9. [프로덕션 배포 체크리스트](#9-프로덕션-배포-체크리스트)

---

## 1. 개요

### 1.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            테스트 환경                                    │
│                                                                         │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│   │ Test Host 1 │     │ Test Host 2 │     │ Test Host 3 │              │
│   │ (Windows)   │     │ (Linux)     │     │ (Docker)    │              │
│   │ Agent:10050 │     │ Agent:10050 │     │ Agent:10050 │              │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘              │
│          │                   │                   │                      │
│          └───────────────────┼───────────────────┘                      │
│                              │                                          │
│                              ▼                                          │
│   ┌──────────────────────────────────────────────┐                     │
│   │              Docker Compose                   │                     │
│   │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │                 │
│   │  │  Zabbix    │  │  Zabbix    │  │ PostgreSQL │  │                 │
│   │  │  Server    │◀─│  Web       │  │+TimescaleDB│  │                 │
│   │  │  :10051    │  │  :8080     │  │   :5432    │  │                 │
│   │  └────────────┘  └────────────┘  └────────────┘  │                 │
│   └──────────────────────────────────────────────┘                     │
│                              │                                          │
│                              ▼                                          │
│   ┌──────────────────────────────────────────────┐                     │
│   │           SYNUSON Monitor                     │                     │
│   │           Next.js :3000                       │                     │
│   │           (본 프로젝트)                         │                     │
│   └──────────────────────────────────────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 구성 요소

| 구성 요소 | 역할 | 포트 |
|-----------|------|------|
| Zabbix Server | 모니터링 데이터 수집 및 처리 | 10051 |
| Zabbix Web | Zabbix 관리 웹 인터페이스 | 8080 |
| PostgreSQL + TimescaleDB | Zabbix 데이터 저장소 (시계열 최적화) | 5432 |
| Zabbix Agent | 호스트 모니터링 에이전트 | 10050 |
| SYNUSON Monitor | 대시보드 프론트엔드 | 3000 |

---

## 2. 사전 요구사항

### 2.1 하드웨어 요구사항 (테스트 환경)

| 항목 | 최소 사양 | 권장 사양 |
|------|----------|----------|
| CPU | 2코어 | 4코어 |
| RAM | 4GB | 8GB |
| 디스크 | 20GB | 50GB |
| 네트워크 | 100Mbps | 1Gbps |

### 2.2 소프트웨어 요구사항

#### Windows 환경
- Windows 10/11 또는 Windows Server 2016+
- Docker Desktop for Windows
- Node.js 18.x 이상
- Git

#### Linux 환경
- Ubuntu 20.04/22.04 또는 CentOS 7/8
- Docker 및 Docker Compose
- Node.js 18.x 이상
- Git

### 2.3 Docker Desktop 설치 (Windows)

1. [Docker Desktop 다운로드](https://www.docker.com/products/docker-desktop/)

2. 설치 후 WSL 2 활성화:
```powershell
# PowerShell (관리자 권한)
wsl --install
wsl --set-default-version 2
```

3. Docker Desktop 실행 및 확인:
```powershell
docker --version
docker-compose --version
```

---

## 3. Zabbix 서버 구축 (Docker)

### 3.1 프로젝트 디렉토리 생성

```powershell
# Windows PowerShell
mkdir C:\zabbix-test
cd C:\zabbix-test
```

```bash
# Linux/Mac
mkdir ~/zabbix-test
cd ~/zabbix-test
```

### 3.2 Docker Compose 파일 생성

`docker-compose.yml` 파일을 생성합니다 (PostgreSQL + TimescaleDB):

```yaml
version: '3.8'

services:
  # PostgreSQL + TimescaleDB 데이터베이스
  postgres-server:
    image: timescale/timescaledb:2.11.2-pg15
    container_name: zabbix-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: zabbix
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_password
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=256MB"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - zabbix-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zabbix -d zabbix"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Zabbix Server (PostgreSQL)
  zabbix-server:
    image: zabbix/zabbix-server-pgsql:alpine-6.4-latest
    container_name: zabbix-server
    restart: unless-stopped
    environment:
      DB_SERVER_HOST: postgres-server
      POSTGRES_DB: zabbix
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_password
      ZBX_CACHESIZE: 128M
      ZBX_HISTORYCACHESIZE: 64M
      ZBX_HISTORYINDEXCACHESIZE: 16M
      ZBX_TRENDCACHESIZE: 16M
      ZBX_VALUECACHESIZE: 64M
      ZBX_ENABLE_TIMESCALEDB: "true"
    ports:
      - "10051:10051"
    volumes:
      - zabbix-server-data:/var/lib/zabbix
      - zabbix-snmptraps:/var/lib/zabbix/snmptraps
    depends_on:
      postgres-server:
        condition: service_healthy
    networks:
      - zabbix-network

  # Zabbix Web Interface (PostgreSQL)
  zabbix-web:
    image: zabbix/zabbix-web-nginx-pgsql:alpine-6.4-latest
    container_name: zabbix-web
    restart: unless-stopped
    environment:
      ZBX_SERVER_HOST: zabbix-server
      DB_SERVER_HOST: postgres-server
      POSTGRES_DB: zabbix
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_password
      PHP_TZ: Asia/Seoul
    ports:
      - "8080:8080"
    depends_on:
      - zabbix-server
      - postgres-server
    networks:
      - zabbix-network

  # Zabbix Agent (Zabbix 서버 자체 모니터링용)
  zabbix-agent:
    image: zabbix/zabbix-agent:alpine-6.4-latest
    container_name: zabbix-agent
    restart: unless-stopped
    environment:
      ZBX_HOSTNAME: "Zabbix server"
      ZBX_SERVER_HOST: zabbix-server
      ZBX_SERVER_PORT: 10051
      ZBX_ACTIVE_ALLOW: "true"
    ports:
      - "10050:10050"
    depends_on:
      - zabbix-server
    networks:
      - zabbix-network
    privileged: true

volumes:
  postgres-data:
  zabbix-server-data:
  zabbix-snmptraps:

networks:
  zabbix-network:
    driver: bridge
```

### 3.3 Zabbix 서버 시작

```powershell
# Docker Compose 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f zabbix-server
```

### 3.4 서비스 시작 확인

서비스가 완전히 시작될 때까지 약 2-3분 소요됩니다.

```powershell
# 모든 컨테이너 상태 확인
docker ps

# 예상 출력:
# CONTAINER ID   IMAGE                                    STATUS         PORTS
# xxxx           zabbix/zabbix-web-nginx-pgsql:...       Up 2 minutes   0.0.0.0:8080->8080/tcp
# xxxx           zabbix/zabbix-server-pgsql:...          Up 2 minutes   0.0.0.0:10051->10051/tcp
# xxxx           zabbix/zabbix-agent:...                 Up 2 minutes   0.0.0.0:10050->10050/tcp
# xxxx           timescale/timescaledb:2.11.2-pg15        Up 3 minutes   5432/tcp
```

### 3.5 Zabbix 웹 접속 확인

브라우저에서 접속: **http://localhost:8080**

기본 로그인 정보:
- **Username:** Admin
- **Password:** zabbix

---

## 4. Zabbix 초기 설정

### 4.1 관리자 비밀번호 변경

1. Zabbix 웹 로그인 (http://localhost:8080)
2. **Users** → **Users** → **Admin** 클릭
3. **Change password** 클릭
4. 새 비밀번호 설정

### 4.2 호스트 그룹 생성

1. **Data collection** → **Host groups** 이동
2. **Create host group** 클릭
3. 그룹 생성 예시:
   - `Production Servers` - 운영 서버
   - `Development Servers` - 개발 서버
   - `Network Devices` - 네트워크 장비
   - `Database Servers` - 데이터베이스 서버

### 4.3 템플릿 확인

Zabbix에는 기본 템플릿이 포함되어 있습니다:

| 템플릿 이름 | 용도 |
|-------------|------|
| Linux by Zabbix agent | Linux 서버 모니터링 |
| Windows by Zabbix agent | Windows 서버 모니터링 |
| PostgreSQL by Zabbix agent | PostgreSQL 데이터베이스 |
| Nginx by Zabbix agent | Nginx 웹서버 |
| Docker by Zabbix agent | Docker 컨테이너 |
| ICMP Ping | 네트워크 연결 확인 |

### 4.4 API 토큰 생성 (SYNUSON Monitor 연동용)

1. **Users** → **API tokens** 이동
2. **Create API token** 클릭
3. 설정:
   - **Name:** SYNUSON Monitor
   - **User:** Admin
   - **Expires at:** 체크 해제 (만료 없음)
4. **Add** 클릭
5. 생성된 토큰 복사 및 안전한 곳에 저장

---

## 5. Zabbix Agent 설치

### 5.1 Windows 서버에 Agent 설치

#### 다운로드
[Zabbix Agent 다운로드 페이지](https://www.zabbix.com/download_agents)에서 Windows용 MSI 파일 다운로드

#### 설치 (GUI)
1. MSI 파일 실행
2. 설정:
   - **Zabbix server IP:** Docker 호스트 IP (예: 192.168.1.100)
   - **Agent hostname:** 서버 이름 (예: Windows-Server-01)
   - **Agent listen port:** 10050
3. 설치 완료

#### 설치 (명령줄)
```powershell
# PowerShell (관리자 권한)
msiexec /i zabbix_agent-6.4.0-windows-amd64-openssl.msi /qn ^
  SERVER=192.168.1.100 ^
  SERVERACTIVE=192.168.1.100 ^
  HOSTNAME=Windows-Server-01 ^
  LISTENPORT=10050
```

#### 설정 파일 위치
```
C:\Program Files\Zabbix Agent\zabbix_agentd.conf
```

#### 주요 설정
```ini
# Zabbix 서버 IP
Server=192.168.1.100

# Active 모드 서버
ServerActive=192.168.1.100

# 호스트 이름 (Zabbix에 등록할 이름)
Hostname=Windows-Server-01

# 로그 파일
LogFile=C:\Program Files\Zabbix Agent\zabbix_agentd.log

# 리슨 포트
ListenPort=10050
```

#### 서비스 관리
```powershell
# 서비스 시작
net start "Zabbix Agent"

# 서비스 중지
net stop "Zabbix Agent"

# 서비스 재시작
net stop "Zabbix Agent" && net start "Zabbix Agent"

# 상태 확인
sc query "Zabbix Agent"
```

#### 방화벽 설정
```powershell
# 인바운드 규칙 추가 (Zabbix Agent 포트)
netsh advfirewall firewall add rule name="Zabbix Agent" dir=in action=allow protocol=TCP localport=10050
```

### 5.2 Linux 서버에 Agent 설치

#### Ubuntu/Debian
```bash
# Zabbix 저장소 추가
wget https://repo.zabbix.com/zabbix/6.4/ubuntu/pool/main/z/zabbix-release/zabbix-release_6.4-1+ubuntu$(lsb_release -rs)_all.deb
sudo dpkg -i zabbix-release_6.4-1+ubuntu$(lsb_release -rs)_all.deb
sudo apt update

# Agent 설치
sudo apt install zabbix-agent

# 설정 파일 편집
sudo nano /etc/zabbix/zabbix_agentd.conf
```

#### CentOS/RHEL
```bash
# Zabbix 저장소 추가
sudo rpm -Uvh https://repo.zabbix.com/zabbix/6.4/rhel/$(rpm -E %{rhel})/x86_64/zabbix-release-6.4-1.el$(rpm -E %{rhel}).noarch.rpm

# Agent 설치
sudo yum install zabbix-agent

# 설정 파일 편집
sudo vi /etc/zabbix/zabbix_agentd.conf
```

#### 설정 파일 (/etc/zabbix/zabbix_agentd.conf)
```ini
# Zabbix 서버 IP
Server=192.168.1.100

# Active 모드 서버
ServerActive=192.168.1.100

# 호스트 이름
Hostname=Linux-Server-01

# 로그 파일
LogFile=/var/log/zabbix/zabbix_agentd.log

# PID 파일
PidFile=/run/zabbix/zabbix_agentd.pid
```

#### 서비스 시작
```bash
# 서비스 시작
sudo systemctl start zabbix-agent

# 부팅 시 자동 시작
sudo systemctl enable zabbix-agent

# 상태 확인
sudo systemctl status zabbix-agent
```

#### 방화벽 설정
```bash
# Ubuntu (UFW)
sudo ufw allow 10050/tcp

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=10050/tcp
sudo firewall-cmd --reload
```

### 5.3 Agent 연결 테스트

Zabbix 서버에서 Agent 연결 테스트:

```bash
# Docker 컨테이너 내부에서 테스트
docker exec -it zabbix-server zabbix_get -s <AGENT_IP> -k agent.ping

# 예상 출력: 1 (성공)

# 시스템 정보 확인
docker exec -it zabbix-server zabbix_get -s <AGENT_IP> -k system.uname
```

### 5.4 Zabbix에 호스트 등록

1. Zabbix 웹 접속 (http://localhost:8080)
2. **Data collection** → **Hosts** 이동
3. **Create host** 클릭
4. 설정:
   - **Host name:** Windows-Server-01
   - **Groups:** 적절한 그룹 선택
   - **Interfaces:**
     - Type: Agent
     - IP address: Agent가 설치된 서버 IP
     - Port: 10050
   - **Templates:**
     - Windows by Zabbix agent (Windows인 경우)
     - Linux by Zabbix agent (Linux인 경우)
5. **Add** 클릭

---

## 6. SYNUSON Monitor 연동

### 6.1 환경 변수 설정

SYNUSON Monitor 프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Zabbix API 설정
ZABBIX_URL=http://localhost:8080/api_jsonrpc.php
ZABBIX_USER=Admin
ZABBIX_PASSWORD=your_new_password

# 또는 API 토큰 사용 (권장)
# ZABBIX_API_TOKEN=your_api_token_here

# 앱 설정
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6.2 Zabbix 클라이언트 설정 확인

`src/lib/zabbix/client.ts` 파일에서 연결 설정 확인:

```typescript
// 환경 변수에서 설정 읽기
const ZABBIX_URL = process.env.ZABBIX_URL || 'http://localhost:8080/api_jsonrpc.php';
const ZABBIX_USER = process.env.ZABBIX_USER || 'Admin';
const ZABBIX_PASSWORD = process.env.ZABBIX_PASSWORD || 'zabbix';
```

### 6.3 SYNUSON Monitor 시작

```powershell
# 프로젝트 디렉토리로 이동
cd C:\Users\User\SYNUSON\synuson-monitor

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

### 6.4 연동 확인

1. 브라우저에서 접속: **http://localhost:3000**
2. 로그인 (Zabbix 계정과 동일)
3. 대시보드에서 호스트 및 장애 정보 확인

---

## 7. 테스트 및 검증

### 7.1 연결 테스트

#### API 연결 확인
```bash
# Zabbix API 버전 확인
curl -X POST http://localhost:8080/api_jsonrpc.php \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "apiinfo.version",
    "params": [],
    "id": 1
  }'
```

#### 호스트 목록 확인
```bash
# 인증 후 호스트 목록 조회
curl -X POST http://localhost:8080/api_jsonrpc.php \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "user.login",
    "params": {
      "user": "Admin",
      "password": "your_password"
    },
    "id": 1
  }'
```

### 7.2 모니터링 데이터 확인

#### Zabbix 웹에서 확인
1. **Monitoring** → **Latest data** 이동
2. 호스트 선택 후 수집된 데이터 확인

#### SYNUSON Monitor에서 확인
1. 대시보드 → 호스트 상태 확인
2. 리소스 사용량 그래프 확인
3. 장애 목록 확인

### 7.3 알림 테스트

#### 테스트 장애 발생
```bash
# Linux 서버에서 CPU 부하 발생
stress --cpu 4 --timeout 60

# 또는 메모리 부하
stress --vm 2 --vm-bytes 1G --timeout 60
```

#### 장애 확인
1. Zabbix 웹: **Monitoring** → **Problems**
2. SYNUSON Monitor: 장애 페이지에서 확인

---

## 8. 문제 해결

### 8.1 일반적인 문제

#### Docker 컨테이너 시작 실패

```bash
# 로그 확인
docker-compose logs zabbix-server
docker-compose logs postgres-server

# 컨테이너 재시작
docker-compose restart

# 전체 재구성
docker-compose down
docker-compose up -d
```

#### Zabbix 웹 접속 불가

1. 컨테이너 상태 확인:
```bash
docker ps
```

2. 포트 충돌 확인:
```bash
netstat -an | findstr 8080
```

3. 방화벽 확인:
```powershell
netsh advfirewall firewall show rule name="Zabbix"
```

#### Agent 연결 실패

1. Agent 서비스 상태 확인
2. 방화벽 포트 (10050) 확인
3. IP 주소 및 호스트 이름 확인
4. Zabbix 서버에서 Agent로 연결 테스트:
```bash
docker exec -it zabbix-server zabbix_get -s <AGENT_IP> -k agent.ping
```

### 8.2 SYNUSON Monitor 연동 문제

#### API 연결 실패

1. `.env.local` 파일 확인
2. Zabbix URL 접근 가능 확인:
```bash
curl http://localhost:8080/api_jsonrpc.php
```

3. 인증 정보 확인

#### 데이터가 표시되지 않음

1. Zabbix에 호스트가 등록되어 있는지 확인
2. Agent가 데이터를 수집 중인지 확인
3. 브라우저 개발자 도구에서 API 요청 확인

### 8.3 로그 위치

| 구성 요소 | 로그 위치 |
|-----------|----------|
| Zabbix Server | `docker logs zabbix-server` |
| Zabbix Web | `docker logs zabbix-web` |
| PostgreSQL | `docker logs zabbix-postgres` |
| Zabbix Agent (Windows) | `C:\Program Files\Zabbix Agent\zabbix_agentd.log` |
| Zabbix Agent (Linux) | `/var/log/zabbix/zabbix_agentd.log` |
| SYNUSON Monitor | 터미널 출력 또는 `.next/` 로그 |

---

## 9. 프로덕션 배포 체크리스트

### 9.1 보안

- [ ] Zabbix Admin 비밀번호 변경
- [ ] API 토큰 사용 (비밀번호 대신)
- [ ] HTTPS 설정 (SSL 인증서)
- [ ] 방화벽 규칙 최소화
- [ ] 네트워크 세그먼트 분리
- [ ] 정기 백업 설정

### 9.2 성능

- [ ] PostgreSQL 튜닝 (shared_buffers, effective_cache_size 등)
- [ ] Zabbix 캐시 설정 최적화
- [ ] 히스토리 보관 기간 설정
- [ ] 불필요한 아이템 비활성화

### 9.3 고가용성 (HA)

- [ ] Zabbix Server 이중화
- [ ] PostgreSQL 복제 설정
- [ ] 로드 밸런서 구성
- [ ] 모니터링 시스템 자체 모니터링

### 9.4 운영

- [ ] 알림 채널 설정 (이메일, Telegram 등)
- [ ] 에스컬레이션 정책 수립
- [ ] 정기 점검 일정 수립
- [ ] 문서화 및 교육

---

## 부록

### A. 유용한 명령어

```bash
# Docker Compose 명령어
docker-compose up -d          # 시작
docker-compose down           # 중지
docker-compose restart        # 재시작
docker-compose logs -f        # 로그 확인
docker-compose ps             # 상태 확인

# Zabbix Server 명령어
docker exec -it zabbix-server zabbix_server -R config_cache_reload  # 설정 리로드

# PostgreSQL 접속
docker exec -it zabbix-postgres psql -U zabbix -d zabbix
```

### B. 주요 포트

| 포트 | 서비스 | 설명 |
|------|--------|------|
| 3000 | SYNUSON Monitor | 웹 대시보드 |
| 8080 | Zabbix Web | Zabbix 관리 인터페이스 |
| 10050 | Zabbix Agent | Agent 리스닝 포트 |
| 10051 | Zabbix Server | Server 리스닝 포트 |
| 5432 | PostgreSQL | 데이터베이스 |

### C. 참고 자료

- [Zabbix 공식 문서](https://www.zabbix.com/documentation/current)
- [Zabbix Docker 이미지](https://hub.docker.com/u/zabbix)
- [Zabbix API 문서](https://www.zabbix.com/documentation/current/en/manual/api)

---

*문서 작성일: 2024년*
*SYNUSON Monitor v1.0*
