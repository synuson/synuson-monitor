#!/bin/bash

# ============================================
# SYNUSON Monitor - Linux 서버 설치 스크립트
# PostgreSQL + TimescaleDB + Zabbix 6.4
# ============================================

set -e

echo "=========================================="
echo "SYNUSON Monitor 설치 스크립트"
echo "=========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수: 로그 출력
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 시스템 확인
log_info "시스템 확인 중..."

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    log_info "운영체제: $OS $VER"
else
    log_error "지원되지 않는 운영체제입니다."
    exit 1
fi

# 2. Docker 설치 확인
log_info "Docker 설치 확인 중..."

if ! command -v docker &> /dev/null; then
    log_warn "Docker가 설치되어 있지 않습니다. 설치를 시작합니다..."

    # Ubuntu/Debian
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # CentOS/RHEL
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        log_error "자동 Docker 설치를 지원하지 않는 운영체제입니다."
        log_error "수동으로 Docker를 설치한 후 다시 실행해주세요."
        exit 1
    fi

    # 현재 사용자를 docker 그룹에 추가
    sudo usermod -aG docker $USER
    log_warn "Docker 그룹에 추가되었습니다. 로그아웃 후 다시 로그인해주세요."
fi

DOCKER_VERSION=$(docker --version)
log_info "Docker 버전: $DOCKER_VERSION"

# 3. Docker Compose 확인
log_info "Docker Compose 확인 중..."

if ! docker compose version &> /dev/null; then
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose가 설치되어 있지 않습니다."
        log_error "Docker Desktop 또는 docker-compose-plugin을 설치해주세요."
        exit 1
    fi
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

log_info "Docker Compose 사용 가능"

# 4. 방화벽 설정
log_info "방화벽 포트 확인 중..."

# UFW (Ubuntu)
if command -v ufw &> /dev/null; then
    log_info "UFW 방화벽 감지됨"
    echo "다음 포트를 열어야 합니다:"
    echo "  - 8080 (Zabbix Web)"
    echo "  - 10050 (Zabbix Agent)"
    echo "  - 10051 (Zabbix Server)"
    echo "  - 3000 (SYNUSON Monitor)"
    echo ""
    read -p "방화벽 포트를 자동으로 열겠습니까? (y/n): " open_ports
    if [[ "$open_ports" == "y" ]]; then
        sudo ufw allow 8080/tcp
        sudo ufw allow 10050/tcp
        sudo ufw allow 10051/tcp
        sudo ufw allow 3000/tcp
        log_info "방화벽 포트가 열렸습니다."
    fi

# Firewalld (CentOS/RHEL)
elif command -v firewall-cmd &> /dev/null; then
    log_info "Firewalld 방화벽 감지됨"
    echo "다음 포트를 열어야 합니다:"
    echo "  - 8080 (Zabbix Web)"
    echo "  - 10050 (Zabbix Agent)"
    echo "  - 10051 (Zabbix Server)"
    echo "  - 3000 (SYNUSON Monitor)"
    echo ""
    read -p "방화벽 포트를 자동으로 열겠습니까? (y/n): " open_ports
    if [[ "$open_ports" == "y" ]]; then
        sudo firewall-cmd --permanent --add-port=8080/tcp
        sudo firewall-cmd --permanent --add-port=10050/tcp
        sudo firewall-cmd --permanent --add-port=10051/tcp
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --reload
        log_info "방화벽 포트가 열렸습니다."
    fi
fi

# 5. 디렉토리 생성
log_info "필요한 디렉토리 생성 중..."

mkdir -p alertscripts
mkdir -p externalscripts

# 6. Docker Compose 실행
log_info "Zabbix 컨테이너 시작 중..."

$COMPOSE_CMD up -d

# 7. 상태 확인
log_info "컨테이너 상태 확인 중..."
sleep 5

$COMPOSE_CMD ps

echo ""
echo "=========================================="
echo "설치 완료!"
echo "=========================================="
echo ""
echo "서비스 접속 정보:"
echo "  - Zabbix Web: http://$(hostname -I | awk '{print $1}'):8080"
echo "  - Username: Admin"
echo "  - Password: zabbix"
echo ""
echo "TimescaleDB + PostgreSQL 15 기반"
echo ""
echo "초기화 완료까지 2-3분 대기 후 접속하세요."
echo ""
echo "로그 확인: $COMPOSE_CMD logs -f"
echo "중지: $COMPOSE_CMD down"
echo "삭제 (데이터 포함): $COMPOSE_CMD down -v"
echo ""
