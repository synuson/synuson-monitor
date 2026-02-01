import { z } from 'zod';

// ============================================
// SQL Injection & XSS Prevention Patterns
// ============================================
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
  /(\bUNION\b.*\bSELECT\b)/i,
  /(--|#|\/\*|\*\/)/,
  /(\bOR\b\s+\d+=\d+)/i,
  /(\bAND\b\s+\d+=\d+)/i,
  /(';|";|`)/,
  /(\bEXEC\b|\bEXECUTE\b)/i,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

/**
 * Check for potential SQL injection
 */
export function hasSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check for potential XSS
 */
export function hasXss(value: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/[<>'"`;]/g, '')
    .trim()
    .slice(0, 1000); // Max length
}

/**
 * Safe string schema with injection detection
 */
export const safeString = (maxLength = 255) =>
  z.string()
    .max(maxLength)
    .refine(val => !hasSqlInjection(val), 'Invalid characters detected')
    .refine(val => !hasXss(val), 'Invalid characters detected');

/**
 * Safe ID schema (alphanumeric only)
 */
export const safeId = z.string()
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')
  .max(100);

/**
 * Zabbix API 액션 검증
 */
export const zabbixActionSchema = z.enum([
  'hosts',
  'hostgroups',
  'problems',
  'triggers',
  'stats',
  'severity-summary',
  'top-cpu',
  'top-memory',
  'http-tests',
  'media-types',
  'actions',
  'history',
  'events',
]);

export type ZabbixAction = z.infer<typeof zabbixActionSchema>;

/**
 * Zabbix API 쿼리 파라미터 검증
 */
export const zabbixQuerySchema = z.object({
  action: zabbixActionSchema.optional(),
  groupid: safeId.optional(),
  itemid: safeId.optional(),
  hostid: safeId.optional(),
  type: z.coerce.number().min(0).max(4).optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
  time_from: z.string().regex(/^\d+$/).optional(),
  time_till: z.string().regex(/^\d+$/).optional(),
});

export type ZabbixQuery = z.infer<typeof zabbixQuerySchema>;

/**
 * 로그인 요청 검증
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required').max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Telegram 설정 검증
 */
export const telegramConfigSchema = z.object({
  botToken: z.string().min(10, 'Invalid bot token'),
  chatId: z.string().min(1, 'Chat ID is required'),
});

export type TelegramConfig = z.infer<typeof telegramConfigSchema>;

/**
 * 흔한 비밀번호 패턴 (확장 가능)
 */
const COMMON_PASSWORD_PATTERNS = [
  'password', 'qwerty', 'letmein', 'welcome', 'monkey',
  'dragon', 'master', 'sunshine', 'princess', 'football',
  'baseball', 'iloveyou', 'trustno1', 'admin', 'login',
];

/**
 * 비밀번호가 흔한 패턴을 포함하는지 확인
 */
function containsCommonPattern(password: string): boolean {
  const lower = password.toLowerCase();
  return COMMON_PASSWORD_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * 강력한 비밀번호 스키마
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
  .refine(
    (val) => !containsCommonPattern(val),
    'Password contains a common pattern. Please choose a stronger password.'
  )
  .refine(
    (val) => !/(.)\1{2,}/.test(val),
    'Password cannot contain more than 2 repeated characters'
  );

/**
 * 사용자 생성 검증
 */
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email').optional(),
  password: strongPasswordSchema,
  role: z.enum(['admin', 'operator', 'viewer']).default('viewer'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * 비밀번호 변경 검증
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * 환경 변수 검증
 */
export const envSchema = z.object({
  ZABBIX_URL: z.string().url('Invalid Zabbix URL'),
  ZABBIX_USER: z.string().optional(),
  ZABBIX_PASSWORD: z.string().optional(),
  ZABBIX_API_TOKEN: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * 검증 헬퍼 함수
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((e: { message: string }) => e.message).join(', ');
    throw new Error(`Validation error: ${errors}`);
  }
  return result.data;
}

/**
 * 안전한 검증 (에러 대신 null 반환)
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((e: { message: string }) => e.message),
  };
}
