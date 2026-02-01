/**
 * Session Manager
 * 세션 무효화 및 관리를 위한 유틸리티
 */

interface RevokedSession {
  userId: string;
  revokedAt: number;
  reason?: string;
}

// In-Memory 저장소 (프로덕션에서는 Redis 사용 권장)
const revokedSessions = new Map<string, RevokedSession>();
const userRevokedBefore = new Map<string, number>();

/**
 * 특정 세션 무효화
 */
export function revokeSession(sessionId: string, userId: string, reason?: string): void {
  revokedSessions.set(sessionId, {
    userId,
    revokedAt: Date.now(),
    reason,
  });
}

/**
 * 사용자의 모든 세션 무효화 (비밀번호 변경, 보안 이벤트 등)
 */
export function revokeAllUserSessions(userId: string, reason?: string): void {
  userRevokedBefore.set(userId, Date.now());

  // 관련 세션 모두 제거
  for (const [sessionId, session] of revokedSessions.entries()) {
    if (session.userId === userId) {
      revokedSessions.delete(sessionId);
    }
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'REVOKE_ALL_SESSIONS',
    userId,
    reason,
  }));
}

/**
 * 세션이 유효한지 확인
 */
export function isSessionValid(sessionId: string, userId: string, issuedAt: number): boolean {
  // 특정 세션이 무효화되었는지 확인
  if (revokedSessions.has(sessionId)) {
    return false;
  }

  // 사용자의 모든 세션이 무효화되었는지 확인 (issuedAt 이전)
  const revokedBefore = userRevokedBefore.get(userId);
  if (revokedBefore && issuedAt < revokedBefore) {
    return false;
  }

  return true;
}

/**
 * 만료된 무효화 정보 정리 (24시간 이상 된 것)
 */
export function cleanupRevokedSessions(): void {
  const expiryTime = Date.now() - 24 * 60 * 60 * 1000; // 24시간

  for (const [sessionId, session] of revokedSessions.entries()) {
    if (session.revokedAt < expiryTime) {
      revokedSessions.delete(sessionId);
    }
  }

  for (const [userId, revokedAt] of userRevokedBefore.entries()) {
    if (revokedAt < expiryTime) {
      userRevokedBefore.delete(userId);
    }
  }
}

// 1시간마다 정리 실행
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRevokedSessions, 60 * 60 * 1000);
}

/**
 * 활성 세션 정보 (디버깅/관리용)
 */
export function getSessionStats(): {
  revokedSessionsCount: number;
  usersWithRevokedSessions: number;
} {
  return {
    revokedSessionsCount: revokedSessions.size,
    usersWithRevokedSessions: userRevokedBefore.size,
  };
}
