/**
 * Next.js Instrumentation
 * 서버 시작 시 실행되는 코드
 */
export async function register() {
  // 서버 사이드에서만 실행
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
}
