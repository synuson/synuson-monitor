import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ============================================
// Rate Limiting (In-Memory Store)
// Production: Use Redis
// ============================================
interface RateLimitRecord {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const RATE_LIMIT_CONFIG = {
  general: { max: 100, window: 60 * 1000 }, // 100 req/min
  auth: { max: 5, window: 60 * 1000, blockDuration: 15 * 60 * 1000 }, // 5 attempts/min, 15min block
  api: { max: 60, window: 60 * 1000 }, // 60 req/min for API
};

function checkRateLimit(
  identifier: string,
  config: { max: number; window: number; blockDuration?: number }
): { allowed: boolean; remaining: number; blocked?: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Check if blocked (bruteforce protection)
  if (record?.blocked && record.blockedUntil && now < record.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      blocked: true,
      retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  // Reset if window expired
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + config.window });
    return { allowed: true, remaining: config.max - 1 };
  }

  // Check limit
  if (record.count >= config.max) {
    // Block for extended period on repeated violations
    if (config.blockDuration) {
      record.blocked = true;
      record.blockedUntil = now + config.blockDuration;
      rateLimitStore.set(identifier, record);
    }
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count++;
  rateLimitStore.set(identifier, record);
  return { allowed: true, remaining: config.max - record.count };
}

// ============================================
// Route Configuration
// ============================================
const PROTECTED_API_ROUTES = [
  '/api/zabbix',
  '/api/telegram',
  '/api/users',
  '/api/settings',
];

const PUBLIC_ROUTES = [
  '/login',
  '/api/auth',
  '/api/health',
  '/api/realtime',
];

const AUTH_ROUTES = [
  '/api/auth/callback',
  '/api/auth/signin',
];

// ============================================
// CORS Headers
// ============================================
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  process.env.NEXTAUTH_URL,
].filter(Boolean);

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

// ============================================
// Security Headers
// ============================================
const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

// ============================================
// Middleware
// ============================================
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

  // 1. Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // 2. Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // 3. Public routes - no auth required
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();

    // Apply security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // 4. Rate limiting for auth routes (bruteforce protection)
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const authLimit = checkRateLimit(`auth:${clientIp}`, RATE_LIMIT_CONFIG.auth);

    if (!authLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: authLimit.blocked
            ? 'Too many failed attempts. Account temporarily locked.'
            : 'Too many requests. Please try again later.',
          retryAfter: authLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(authLimit.retryAfter || 60),
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.auth.max),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // 5. Protected API routes
  if (PROTECTED_API_ROUTES.some((route) => pathname.startsWith(route))) {
    // Rate limiting
    const apiLimit = checkRateLimit(`api:${clientIp}`, RATE_LIMIT_CONFIG.api);

    if (!apiLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(apiLimit.retryAfter || 60),
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.api.max),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Authentication check
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // RBAC: Check role for admin-only routes
    if (pathname.startsWith('/api/users') && request.method !== 'GET') {
      if (token.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_CONFIG.api.max));
    response.headers.set('X-RateLimit-Remaining', String(apiLimit.remaining));

    // Security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // 6. Page routes - require authentication
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to login
  if (!token && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Apply security headers
  const response = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
