import NextAuth from 'next-auth';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

// NextAuth instance
const { auth, signIn, signOut } = NextAuth(authConfig);

export { auth, signIn, signOut };

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'operator' | 'viewer';
}

/**
 * 비밀번호 해싱 (로컬 사용자용)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * 비밀번호 검증 (로컬 사용자용)
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 역할 기반 권한 확인
 */
export function hasPermission(
  userRole: string,
  requiredRole: 'admin' | 'operator' | 'viewer'
): boolean {
  const roleHierarchy: Record<string, number> = {
    admin: 3,
    operator: 2,
    viewer: 1,
  };

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}

/**
 * API 요청에서 사용자 정보 추출
 */
export function getUserFromRequest(request: Request): User | null {
  // NextAuth 세션에서 사용자 정보 추출
  // 이 함수는 미들웨어와 함께 사용됨
  return null;
}
