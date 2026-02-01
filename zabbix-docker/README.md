# Zabbix 테스트 환경 (Docker)

SYNUSON Monitor 테스트를 위한 Zabbix 서버 Docker 환경입니다.

## 데이터베이스

**PostgreSQL 15 + TimescaleDB 2.11** 사용

### TimescaleDB 장점
- 시계열 데이터 최적화 (히스토리/트렌드)
- 자동 데이터 압축
- 빠른 범위 쿼리
- 대용량 환경에서 탁월한 성능

## 빠른 시작

### Windows (Docker Desktop)
```bash
docker-compose up -d
```

### Linux 서버 (자동 설치)
```bash
# 실행 권한 부여
chmod +x install-linux.sh

# 설치 스크립트 실행 (Docker 자동 설치 포함)
./install-linux.sh
```

### 수동 시작
```bash
# 시작
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down

# 완전 삭제 (데이터 포함)
docker-compose down -v
```

## 접속 정보

| 서비스 | URL | 포트 |
|--------|-----|------|
| Zabbix Web | http://localhost:8080 | 8080 |
| Zabbix Server | - | 10051 |
| Zabbix Agent | - | 10050 |
| PostgreSQL | - | 5432 |

## 기본 로그인

- **Username:** Admin
- **Password:** zabbix

## 포함된 서비스

1. **PostgreSQL 15 + TimescaleDB** - 시계열 최적화 데이터베이스
2. **Zabbix Server 6.4** - 모니터링 서버
3. **Zabbix Web (Nginx)** - 웹 인터페이스
4. **Zabbix Agent** - 서버 자체 모니터링
5. **Zabbix Agent 2** - Docker 모니터링 테스트용

## PostgreSQL 튜닝 설정

docker-compose.yml에 포함된 최적화 설정:

| 설정 | 값 | 설명 |
|------|-----|------|
| max_connections | 200 | 최대 동시 연결 |
| shared_buffers | 256MB | 공유 메모리 버퍼 |
| effective_cache_size | 768MB | OS 캐시 예상 크기 |
| maintenance_work_mem | 128MB | 유지보수 작업 메모리 |
| wal_buffers | 16MB | WAL 버퍼 크기 |

## 유용한 명령어

```bash
# 로그 확인
docker-compose logs -f zabbix-server

# 특정 서비스 재시작
docker-compose restart zabbix-server

# PostgreSQL 접속
docker exec -it zabbix-postgres psql -U zabbix -d zabbix

# TimescaleDB 확장 확인
docker exec -it zabbix-postgres psql -U zabbix -d zabbix -c "SELECT * FROM pg_extension WHERE extname = 'timescaledb';"

# Zabbix Server 접속
docker exec -it zabbix-server /bin/sh

# 데이터베이스 크기 확인
docker exec -it zabbix-postgres psql -U zabbix -d zabbix -c "SELECT pg_size_pretty(pg_database_size('zabbix'));"
```

## MySQL에서 마이그레이션

기존 MySQL 환경에서 마이그레이션하는 경우:

```bash
# 1. 기존 컨테이너 중지 및 삭제
docker-compose down -v

# 2. 새 PostgreSQL 환경 시작
docker-compose up -d

# 3. 첫 시작 시 2-3분 대기 (스키마 초기화)
```

## Linux 서버 요구사항

### 지원 OS
- Ubuntu 20.04 / 22.04 LTS
- Debian 11 / 12
- CentOS 7 / 8 / Stream
- RHEL 7 / 8 / 9

### 방화벽 포트
```bash
# Ubuntu (UFW)
sudo ufw allow 8080/tcp   # Zabbix Web
sudo ufw allow 10050/tcp  # Zabbix Agent
sudo ufw allow 10051/tcp  # Zabbix Server
sudo ufw allow 3000/tcp   # SYNUSON Monitor

# CentOS/RHEL (Firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=10050/tcp
sudo firewall-cmd --permanent --add-port=10051/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 주의사항

- 첫 시작 시 PostgreSQL 초기화로 2-3분 소요
- TimescaleDB 확장은 Zabbix 서버 첫 시작 시 자동 활성화
- 테스트 환경용이므로 프로덕션에서는 보안 설정 필수
- 프로덕션 환경에서는 비밀번호 변경 필수

## 프로덕션 권장 사양

| 모니터링 규모 | Zabbix Server | PostgreSQL |
|--------------|---------------|------------|
| ~100 호스트 | 2코어, 4GB RAM | 2코어, 4GB RAM, 50GB SSD |
| ~500 호스트 | 4코어, 8GB RAM | 4코어, 8GB RAM, 200GB SSD |
| ~1000 호스트 | 8코어, 16GB RAM | 8코어, 16GB RAM, 500GB SSD |
| 1000+ 호스트 | 16코어, 32GB RAM | 분산 DB 구성 권장 |
