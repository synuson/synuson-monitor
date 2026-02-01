type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * 로그 레벨 우선순위
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 현재 로그 레벨
 */
const getCurrentLogLevel = (): LogLevel => {
  const level = process.env.LOG_LEVEL as LogLevel;
  return LOG_LEVELS[level] !== undefined ? level : 'info';
};

/**
 * 로그 레벨 확인
 */
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[getCurrentLogLevel()];
};

/**
 * 로그 포맷팅
 */
const formatLog = (entry: LogEntry): string => {
  const { timestamp, level, message, context, error } = entry;

  // 개발 환경: 가독성 좋은 포맷
  if (process.env.NODE_ENV === 'development') {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColors[level];

    let output = `${color}[${level.toUpperCase()}]${reset} ${message}`;
    if (context && Object.keys(context).length > 0) {
      output += ` ${JSON.stringify(context)}`;
    }
    if (error) {
      output += `\n  Error: ${error.message}`;
      if (error.stack) {
        output += `\n${error.stack}`;
      }
    }
    return output;
  }

  // 프로덕션: JSON 포맷 (로그 수집 시스템용)
  return JSON.stringify(entry);
};

/**
 * 로그 출력
 */
const writeLog = (entry: LogEntry): void => {
  const formatted = formatLog(entry);

  switch (entry.level) {
    case 'debug':
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
};

/**
 * 메인 로거
 */
export const logger = {
  /**
   * 디버그 로그
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    });
  },

  /**
   * 정보 로그
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  },

  /**
   * 경고 로그
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  },

  /**
   * 에러 로그
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!shouldLog('error')) return;

    const errorInfo = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error
        ? { name: 'Error', message: String(error) }
        : undefined;

    writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error: errorInfo,
    });
  },

  /**
   * API 요청 로깅
   */
  api(method: string, path: string, context?: LogContext & { statusCode?: number; duration?: number }): void {
    const { statusCode, duration, ...rest } = context || {};
    const status = statusCode ? `[${statusCode}]` : '';
    const time = duration ? `(${duration}ms)` : '';

    this.info(`${method} ${path} ${status} ${time}`.trim(), rest);
  },

  /**
   * 보안 이벤트 로깅
   */
  security(event: string, context?: LogContext): void {
    this.warn(`[SECURITY] ${event}`, context);
  },

  /**
   * 감사 로그 (항상 기록 + DB 저장)
   */
  audit(action: string, context?: LogContext): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[AUDIT] ${action}`,
      context,
    });

    // DB에 비동기 저장 (실패해도 무시)
    saveAuditLogToDb(action, context).catch(() => {
      // DB 저장 실패 시 콘솔에만 에러 로깅
      console.error('[AUDIT] Failed to save to database');
    });
  },
};

/**
 * 감사 로그 DB 저장 (비동기)
 */
async function saveAuditLogToDb(action: string, context?: LogContext): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies
    const { prisma } = await import('@/lib/prisma');

    await prisma.auditLog.create({
      data: {
        userId: context?.userId as string | undefined,
        action,
        target: context?.action as string | undefined,
        details: context ? JSON.parse(JSON.stringify(context)) : undefined,
        ipAddress: context?.ipAddress as string | undefined,
        userAgent: context?.userAgent as string | undefined,
        status: 'success',
      },
    });
  } catch (error) {
    // 무시 - console에 이미 로깅됨
    void error;
  }
}

/**
 * 요청별 로거 생성
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { requestId, userId, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { requestId, userId, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { requestId, userId, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(message, error, { requestId, userId, ...context }),
  };
}

/**
 * 요청 ID 생성
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default logger;
