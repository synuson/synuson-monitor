/**
 * API Authentication Helper
 * API 키 기반 인증 및 프로그래밍 방식 접근 지원
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';

interface ApiKeyRecord {
  id: string;
  name: string;
  keyHash: string;
  userId: string;
  role: string;
  permissions: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

// In-Memory 저장소 (프로덕션에서는 DB 사용)
const apiKeys = new Map<string, ApiKeyRecord>();

/**
 * API 키 생성
 */
export function generateApiKey(): { key: string; keyHash: string } {
  const key = `synuson_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, keyHash };
}

/**
 * API 키 등록
 */
export function registerApiKey(
  name: string,
  userId: string,
  role: string,
  permissions: string[] = ['read'],
  expiresInDays?: number
): { id: string; key: string } {
  const { key, keyHash } = generateApiKey();
  const id = crypto.randomUUID();

  const record: ApiKeyRecord = {
    id,
    name,
    keyHash,
    userId,
    role,
    permissions,
    createdAt: new Date(),
    expiresAt: expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined,
  };

  apiKeys.set(keyHash, record);

  return { id, key };
}

/**
 * API 키 검증
 */
export function validateApiKey(key: string): ApiKeyRecord | null {
  if (!key.startsWith('synuson_')) {
    return null;
  }

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const record = apiKeys.get(keyHash);

  if (!record) {
    return null;
  }

  // 만료 확인
  if (record.expiresAt && new Date() > record.expiresAt) {
    return null;
  }

  // 마지막 사용 시간 업데이트
  record.lastUsedAt = new Date();
  apiKeys.set(keyHash, record);

  return record;
}

/**
 * API 키 삭제
 */
export function revokeApiKey(keyHash: string): boolean {
  return apiKeys.delete(keyHash);
}

/**
 * 사용자의 모든 API 키 삭제
 */
export function revokeAllUserApiKeys(userId: string): number {
  let count = 0;
  for (const [hash, record] of apiKeys.entries()) {
    if (record.userId === userId) {
      apiKeys.delete(hash);
      count++;
    }
  }
  return count;
}

/**
 * Request에서 인증 정보 추출
 * Bearer Token (JWT) 또는 API Key 지원
 */
export async function getAuthFromRequest(request: NextRequest): Promise<{
  type: 'jwt' | 'apikey' | 'none';
  userId?: string;
  role?: string;
  permissions?: string[];
}> {
  const authHeader = request.headers.get('authorization');

  // API Key 인증
  if (authHeader?.startsWith('Bearer synuson_')) {
    const apiKey = authHeader.substring(7);
    const keyRecord = validateApiKey(apiKey);

    if (keyRecord) {
      return {
        type: 'apikey',
        userId: keyRecord.userId,
        role: keyRecord.role,
        permissions: keyRecord.permissions,
      };
    }
  }

  // JWT 인증 (세션 기반)
  const token = await getToken({ req: request });
  if (token) {
    return {
      type: 'jwt',
      userId: token.sub,
      role: token.role as string,
      permissions: ['*'], // JWT는 모든 권한
    };
  }

  return { type: 'none' };
}

/**
 * 권한 확인 헬퍼
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  if (userPermissions.includes('*')) {
    return true;
  }
  return userPermissions.includes(requiredPermission);
}

/**
 * 역할 확인 헬퍼
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * API 키 목록 조회 (관리용)
 */
export function listApiKeys(userId?: string): Omit<ApiKeyRecord, 'keyHash'>[] {
  const result: Omit<ApiKeyRecord, 'keyHash'>[] = [];

  for (const record of apiKeys.values()) {
    if (!userId || record.userId === userId) {
      const { keyHash, ...rest } = record;
      result.push(rest);
    }
  }

  return result;
}
