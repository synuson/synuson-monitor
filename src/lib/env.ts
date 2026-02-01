import { z } from 'zod';

/**
 * 서버 환경변수 스키마
 */
const serverEnvSchema = z.object({
  // Zabbix 설정
  ZABBIX_URL: z.string().url('ZABBIX_URL must be a valid URL'),
  ZABBIX_USER: z.string().optional(),
  ZABBIX_PASSWORD: z.string().optional(),
  ZABBIX_API_TOKEN: z.string().optional(),

  // NextAuth 설정
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),

  // 환경
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // 로깅
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // 데이터베이스 (선택)
  DATABASE_URL: z.string().optional(),

  // 보안 (선택)
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex characters').optional(),
});

/**
 * 클라이언트 환경변수 스키마
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('SYNUSON Monitor'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

/**
 * 환경변수 검증 결과
 */
export interface EnvValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 서버 환경변수 검증
 */
export function validateServerEnv(): EnvValidationResult {
  const result: EnvValidationResult = {
    success: true,
    errors: [],
    warnings: [],
  };

  // 서버 환경변수 검증
  const serverResult = serverEnvSchema.safeParse(process.env);

  if (!serverResult.success && serverResult.error) {
    result.success = false;
    // Zod v4 uses 'issues', v3 uses 'errors'
    const issues = serverResult.error.issues || (serverResult.error as unknown as { errors: typeof serverResult.error.issues }).errors || [];
    issues.forEach((err) => {
      result.errors.push(`${err.path.join('.')}: ${err.message}`);
    });
  }

  // Zabbix 인증 방식 확인 (경고)
  const hasUserPassword = process.env.ZABBIX_USER && process.env.ZABBIX_PASSWORD;
  const hasApiToken = process.env.ZABBIX_API_TOKEN;

  if (!hasUserPassword && !hasApiToken) {
    result.errors.push('Zabbix authentication required: Set either ZABBIX_USER/ZABBIX_PASSWORD or ZABBIX_API_TOKEN');
    result.success = false;
  }

  if (hasUserPassword && !hasApiToken && process.env.NODE_ENV === 'production') {
    result.warnings.push(
      'Using password authentication in production. API Token is recommended for better security.'
    );
  }

  // NEXTAUTH_URL 확인 (프로덕션에서 필수)
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) {
    result.warnings.push('NEXTAUTH_URL should be set in production for proper callback URLs');
  }

  return result;
}

/**
 * 클라이언트 환경변수 검증
 */
export function validateClientEnv(): EnvValidationResult {
  const result: EnvValidationResult = {
    success: true,
    errors: [],
    warnings: [],
  };

  const clientResult = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!clientResult.success && clientResult.error) {
    const issues = clientResult.error.issues || (clientResult.error as unknown as { errors: typeof clientResult.error.issues }).errors || [];
    issues.forEach((err) => {
      result.warnings.push(`${err.path.join('.')}: ${err.message}`);
    });
  }

  return result;
}

/**
 * 전체 환경변수 검증 및 로깅
 */
export function validateEnv(): void {
  const serverResult = validateServerEnv();
  const clientResult = validateClientEnv();

  // 에러 출력
  if (serverResult.errors.length > 0) {
    console.error('\n❌ Environment Variable Errors:');
    serverResult.errors.forEach((err) => console.error(`   - ${err}`));
  }

  // 경고 출력
  const allWarnings = [...serverResult.warnings, ...clientResult.warnings];
  if (allWarnings.length > 0) {
    console.warn('\n⚠️  Environment Variable Warnings:');
    allWarnings.forEach((warn) => console.warn(`   - ${warn}`));
  }

  // 에러가 있으면 종료 (프로덕션에서만)
  if (!serverResult.success && process.env.NODE_ENV === 'production') {
    console.error('\n🛑 Application startup aborted due to environment variable errors.');
    console.error('   Please fix the errors above and restart.\n');
    process.exit(1);
  }

  if (serverResult.success) {
    console.log('\n✅ Environment variables validated successfully.\n');
  }
}

/**
 * 타입 안전한 환경변수 접근
 */
export const env = {
  // Zabbix
  ZABBIX_URL: process.env.ZABBIX_URL || 'http://localhost:8080/api_jsonrpc.php',
  ZABBIX_USER: process.env.ZABBIX_USER,
  ZABBIX_PASSWORD: process.env.ZABBIX_PASSWORD,
  ZABBIX_API_TOKEN: process.env.ZABBIX_API_TOKEN,

  // NextAuth
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,

  // App
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Client
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'SYNUSON Monitor',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
};
