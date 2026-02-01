/**
 * SYNUSON Monitor - Security Utilities
 * 보안 관련 유틸리티 함수 모음
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// IP Blocking (악의적 접근 차단)
// ============================================
interface BlockedIp {
  ip: string;
  reason: string;
  blockedAt: number;
  expiresAt: number;
  permanent?: boolean;
}

const blockedIps = new Map<string, BlockedIp>();

export function blockIp(ip: string, reason: string, durationMinutes = 60, permanent = false): void {
  blockedIps.set(ip, {
    ip,
    reason,
    blockedAt: Date.now(),
    expiresAt: permanent ? Infinity : Date.now() + durationMinutes * 60 * 1000,
    permanent,
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'IP_BLOCKED',
    ip,
    reason,
    durationMinutes: permanent ? 'permanent' : durationMinutes,
  }));
}

export function unblockIp(ip: string): boolean {
  const result = blockedIps.delete(ip);
  if (result) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'IP_UNBLOCKED',
      ip,
    }));
  }
  return result;
}

export function isIpBlocked(ip: string): { blocked: boolean; reason?: string; expiresAt?: number } {
  const record = blockedIps.get(ip);

  if (!record) {
    return { blocked: false };
  }

  // 만료 확인
  if (!record.permanent && Date.now() > record.expiresAt) {
    blockedIps.delete(ip);
    return { blocked: false };
  }

  return {
    blocked: true,
    reason: record.reason,
    expiresAt: record.expiresAt,
  };
}

export function getBlockedIps(): BlockedIp[] {
  const now = Date.now();
  const result: BlockedIp[] = [];

  for (const [ip, record] of blockedIps.entries()) {
    if (record.permanent || now < record.expiresAt) {
      result.push(record);
    } else {
      blockedIps.delete(ip);
    }
  }

  return result;
}

// ============================================
// 1. CORS Configuration
// ============================================
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Check if origin is allowed
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes('*')) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0];
  }

  return headers;
}

export function handlePreflight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}

// ============================================
// 2. SSRF Prevention
// ============================================
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal', // GCP metadata
  '::1',
  'internal',
  'kubernetes',
];

const ALLOWED_ZABBIX_HOSTS = process.env.ZABBIX_URL
  ? [new URL(process.env.ZABBIX_URL).hostname]
  : [];

export function isUrlSafe(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Allow configured Zabbix hosts
    if (ALLOWED_ZABBIX_HOSTS.includes(hostname)) {
      return true;
    }

    // Block internal/metadata endpoints
    for (const blocked of BLOCKED_HOSTS) {
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return false;
      }
    }

    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname)) {
      // Allow if explicitly in allowed list
      if (!ALLOWED_ZABBIX_HOSTS.some(h => hostname.includes(h))) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================
// 3. Input Sanitization (XSS Prevention)
// ============================================
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

// ============================================
// 4. Error Handling (No Sensitive Info Exposure)
// ============================================
export interface SafeError {
  message: string;
  code?: string;
}

export function sanitizeError(error: unknown, isDevelopment = false): SafeError {
  if (isDevelopment && error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
    };
  }

  // Production: generic error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('authentication')) {
      return { message: 'Authentication required', code: 'AUTH_REQUIRED' };
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return { message: 'Access denied', code: 'ACCESS_DENIED' };
    }
    if (message.includes('not found')) {
      return { message: 'Resource not found', code: 'NOT_FOUND' };
    }
    if (message.includes('validation')) {
      return { message: 'Invalid request', code: 'VALIDATION_ERROR' };
    }
    if (message.includes('timeout')) {
      return { message: 'Request timeout', code: 'TIMEOUT' };
    }
  }

  return { message: 'An error occurred', code: 'INTERNAL_ERROR' };
}

// ============================================
// 5. Request Validation
// ============================================
export function validateContentType(request: NextRequest, expected: string[]): boolean {
  const contentType = request.headers.get('content-type');
  if (!contentType) return expected.length === 0;
  return expected.some(type => contentType.includes(type));
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ============================================
// 6. Security Headers
// ============================================
export const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
};

// ============================================
// 7. Audit Logging Helper
// ============================================
export interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  status: 'success' | 'failure';
}

export function createAuditLog(
  action: string,
  request: NextRequest,
  options: {
    userId?: string;
    resource?: string;
    details?: Record<string, unknown>;
    status?: 'success' | 'failure';
  } = {}
): AuditLogEntry {
  return {
    timestamp: new Date().toISOString(),
    userId: options.userId,
    action,
    resource: options.resource,
    details: options.details,
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
    status: options.status || 'success',
  };
}

// ============================================
// 8. Secret Validation
// ============================================
export function validateSecrets(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check NEXTAUTH_SECRET
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    errors.push('NEXTAUTH_SECRET must be at least 32 characters');
  }
  if (secret && /^(test|dev|example|changeme)/i.test(secret)) {
    errors.push('NEXTAUTH_SECRET appears to be a placeholder value');
  }

  // Check Zabbix credentials
  if (!process.env.ZABBIX_API_TOKEN && (!process.env.ZABBIX_USER || !process.env.ZABBIX_PASSWORD)) {
    errors.push('Zabbix authentication not configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
