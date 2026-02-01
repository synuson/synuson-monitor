import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';
import type { Role, User, Prisma } from '@prisma/client';

/**
 * 사용자 생성 입력
 */
export interface CreateUserInput {
  username: string;
  password: string;
  email?: string;
  role?: Role;
}

/**
 * 사용자 업데이트 입력
 */
export interface UpdateUserInput {
  email?: string;
  role?: Role;
  isActive?: boolean;
}

/**
 * 사용자 서비스
 */
export const userService = {
  /**
   * 사용자 생성
   */
  async create(input: CreateUserInput): Promise<User> {
    const passwordHash = await hashPassword(input.password);

    return prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        role: input.role || 'viewer',
        settings: {
          create: {
            refreshInterval: 30,
            theme: 'system',
            language: 'ko',
          },
        },
      },
    });
  },

  /**
   * 사용자 조회 (ID)
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { settings: true },
    });
  },

  /**
   * 사용자 조회 (username)
   */
  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  },

  /**
   * 사용자 목록 조회
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    where?: Prisma.UserWhereInput;
  }): Promise<{ users: User[]; total: number }> {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: options?.skip,
        take: options?.take,
        orderBy: options?.orderBy || { createdAt: 'desc' },
        where: options?.where,
        include: { settings: true },
      }),
      prisma.user.count({ where: options?.where }),
    ]);

    return { users, total };
  },

  /**
   * 사용자 업데이트
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: input,
    });
  },

  /**
   * 비밀번호 변경
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return true;
  },

  /**
   * 비밀번호 리셋 (관리자용)
   */
  async resetPassword(id: string, newPassword: string): Promise<boolean> {
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { passwordHash, loginAttempts: 0, lockedUntil: null },
    });
    return true;
  },

  /**
   * 사용자 삭제
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  },

  /**
   * 로그인 시도 기록
   */
  async recordLoginAttempt(username: string, success: boolean, ipAddress?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return;

    if (success) {
      // 로그인 성공: 시도 횟수 초기화, 마지막 로그인 시간 업데이트
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
        },
      });

      // 감사 로그
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          ipAddress,
          status: 'success',
        },
      });
    } else {
      // 로그인 실패: 시도 횟수 증가
      const attempts = user.loginAttempts + 1;
      const lockUntil = attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000) // 5회 실패 시 15분 잠금
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: attempts,
          lockedUntil: lockUntil,
        },
      });

      // 감사 로그
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          ipAddress,
          status: 'failure',
          details: { attempts },
        },
      });
    }
  },

  /**
   * 계정 잠금 확인
   */
  async isLocked(username: string): Promise<{ locked: boolean; until?: Date }> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return { locked: false };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { locked: true, until: user.lockedUntil };
    }

    // 잠금 시간 만료됨
    if (user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: null, loginAttempts: 0 },
      });
    }

    return { locked: false };
  },
};

/**
 * 사용자 설정 서비스
 */
export const userSettingsService = {
  /**
   * 설정 조회
   */
  async get(userId: string) {
    return prisma.userSettings.findUnique({
      where: { userId },
    });
  },

  /**
   * 설정 업데이트
   */
  async update(userId: string, data: Prisma.UserSettingsUpdateInput) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: {
        user: { connect: { id: userId } },
        refreshInterval: (data.refreshInterval as number) || 30,
        theme: (data.theme as string) || 'system',
        language: (data.language as string) || 'ko',
        notificationsEnabled: (data.notificationsEnabled as boolean) || false,
        telegramBotToken: data.telegramBotToken as string | null,
        telegramChatId: data.telegramChatId as string | null,
      },
    });
  },
};

/**
 * 감사 로그 서비스
 */
export const auditLogService = {
  /**
   * 로그 기록
   */
  async log(data: {
    userId?: string;
    action: string;
    target?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failure';
  }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        target: data.target,
        details: data.details ? JSON.parse(JSON.stringify(data.details)) : undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        status: data.status || 'success',
      },
    });
  },

  /**
   * 로그 조회
   */
  async find(options?: {
    userId?: string;
    action?: string;
    skip?: number;
    take?: number;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.AuditLogWhereInput = {};

    if (options?.userId) where.userId = options.userId;
    if (options?.action) where.action = options.action;
    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }

    return prisma.auditLog.findMany({
      where,
      skip: options?.skip,
      take: options?.take || 100,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true } } },
    });
  },
};
