# 로그 보존 정책 (Log Retention Policy)

## 1. 개요

이 문서는 SYNUSON Monitor 시스템의 로그 보존 정책을 정의합니다.
ISMS-P 인증 기준 및 관련 법규를 준수합니다.

---

## 2. 적용 범위

- 시스템 접속 로그
- 감사 로그 (Audit Log)
- 보안 이벤트 로그
- 에러 로그
- API 요청 로그

---

## 3. 로그 유형별 보존 기간

| 로그 유형 | 보존 기간 | 근거 |
|----------|----------|------|
| **접속 로그** | 최소 1년 | 정보통신망법 제22조 |
| **감사 로그** | 3년 | 내부 보안 정책 |
| **보안 이벤트** | 3년 | ISMS-P 요구사항 |
| **에러 로그** | 6개월 | 운영 필요성 |
| **API 요청 로그** | 1년 | 내부 보안 정책 |

---

## 4. 로그 항목

### 4.1 접속 로그
- 접속 일시
- 접속자 ID
- 접속 IP 주소
- User-Agent (브라우저 정보)
- 접속 결과 (성공/실패)

### 4.2 감사 로그
- 발생 일시
- 행위자 ID
- 행위 유형 (로그인, 설정 변경, 데이터 조회 등)
- 대상 리소스
- 상세 내용
- 결과 상태

### 4.3 보안 이벤트 로그
- 발생 일시
- 이벤트 유형
- 관련 IP 주소
- 탐지된 위협 정보
- 조치 내용

---

## 5. 로그 저장 위치

### 5.1 데이터베이스
- **테이블**: `audit_logs`
- **데이터베이스**: PostgreSQL
- **백업 주기**: 일간

### 5.2 파일 시스템 (개발/보조)
- **경로**: `/var/log/synuson/`
- **파일명 형식**: `audit-YYYY-MM-DD.log`
- **로테이션**: 일간

### 5.3 클라우드 로그 서비스 (권장)
- AWS CloudWatch Logs
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog

---

## 6. 로그 보호 조치

### 6.1 접근 제어
- 로그 접근 권한: 시스템 관리자 (admin) 전용
- API 접근: `/api/audit-logs` (admin 권한 필요)
- 데이터베이스 직접 접근: DBA 전용

### 6.2 무결성 보호
- 로그 수정/삭제 금지 (Append-only)
- 해시 기반 무결성 검증 (선택)
- 로그 백업 시 체크섬 생성

### 6.3 암호화
- 전송 중: TLS 1.2 이상
- 저장 시: 데이터베이스 암호화 (선택)
- 백업 시: AES-256 암호화

---

## 7. 로그 삭제 절차

### 7.1 자동 삭제
```sql
-- 1년 이상 된 접속 로그 삭제 (월간 실행)
DELETE FROM audit_logs
WHERE action = 'login'
  AND created_at < NOW() - INTERVAL '1 year';

-- 3년 이상 된 감사 로그 삭제 (월간 실행)
DELETE FROM audit_logs
WHERE action != 'login'
  AND created_at < NOW() - INTERVAL '3 years';
```

### 7.2 수동 삭제
1. 삭제 대상 로그 목록 생성
2. 관리자 승인 획득
3. 삭제 전 백업 수행
4. 삭제 실행
5. 삭제 기록 보관

---

## 8. 감사 및 모니터링

### 8.1 정기 점검
- **주기**: 월간
- **점검 항목**:
  - 로그 저장 공간 확인
  - 로그 무결성 검증
  - 보존 기간 준수 확인
  - 접근 권한 검토

### 8.2 이상 징후 탐지
- 대량 로그인 실패 감지
- 비정상적인 접근 패턴 탐지
- 권한 상승 시도 탐지

---

## 9. 관련 법규 및 기준

| 법규/기준 | 관련 조항 |
|----------|----------|
| 정보통신망법 | 제22조 (접속기록의 보관) |
| 개인정보보호법 | 제29조 (안전조치의무) |
| ISMS-P | 2.9.4 (접속 기록 관리) |
| ISMS-P | 2.9.5 (감사 기록 관리) |

---

## 10. 책임 및 역할

| 역할 | 책임 |
|------|------|
| 시스템 관리자 | 로그 시스템 운영 및 관리 |
| 보안 담당자 | 로그 분석 및 이상 징후 대응 |
| DBA | 데이터베이스 로그 관리 및 백업 |
| 개인정보 보호책임자 | 정책 준수 감독 |

---

## 11. 문서 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2024-01 | 최초 작성 | - |

---

## 12. 로그 보존 구현 코드

### 12.1 로그 삭제 스크립트

```bash
#!/bin/bash
# log_cleanup.sh - 로그 보존 정책에 따른 자동 삭제

# 환경 변수
DATABASE_URL="${DATABASE_URL:-postgresql://localhost/synuson}"

# 1년 이상 된 접속 로그 삭제
psql "$DATABASE_URL" -c "
  DELETE FROM audit_logs
  WHERE action IN ('login', 'logout')
    AND created_at < NOW() - INTERVAL '1 year';
"

# 3년 이상 된 감사 로그 삭제
psql "$DATABASE_URL" -c "
  DELETE FROM audit_logs
  WHERE action NOT IN ('login', 'logout')
    AND created_at < NOW() - INTERVAL '3 years';
"

echo "Log cleanup completed at $(date)"
```

### 12.2 Cron 설정

```cron
# 매월 1일 새벽 3시에 로그 정리 실행
0 3 1 * * /opt/synuson/scripts/log_cleanup.sh >> /var/log/synuson/cleanup.log 2>&1
```

---

**문서 최종 수정일**: 2024년 1월
**다음 검토 예정일**: 2025년 1월
