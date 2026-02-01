import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { userService, auditLogService } from '@/lib/services/userService';
import { createUserSchema, safeString } from '@/lib/validation';
import { logger } from '@/lib/logging';
import { z } from 'zod';

// 검색 파라미터 검증 스키마
const searchParamsSchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: safeString(100).optional(),
});

/**
 * GET /api/users - 사용자 목록 조회
 * 권한: admin, operator
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    // 권한 확인 (admin, operator만 사용자 목록 조회 가능)
    if (!token || !['admin', 'operator'].includes(token.role as string)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or operator access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // 검색 파라미터 검증
    const paramsValidation = searchParamsSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
    });

    if (!paramsValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { page, limit, search } = paramsValidation.data;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const { users, total } = await userService.findAll({
      skip,
      take: limit,
      where,
    });

    // 비밀번호 해시 제외
    const sanitizedUsers = users.map((user) => {
      const { passwordHash, ...rest } = user;
      return rest;
    });

    return NextResponse.json({
      success: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch users', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - 사용자 생성
 * 권한: admin
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    // 권한 확인 (admin만 사용자 생성 가능)
    if (!token || token.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 입력값 검증
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues.map((e: { message: string }) => e.message),
        },
        { status: 400 }
      );
    }

    // 사용자명 중복 확인
    const existingUser = await userService.findByUsername(validation.data.username);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 409 }
      );
    }

    // 사용자 생성
    const user = await userService.create(validation.data);

    // 감사 로그
    await auditLogService.log({
      userId: token.sub as string,
      action: 'create_user',
      target: `user:${user.id}`,
      details: { username: user.username, role: user.role },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    logger.info('User created', { userId: user.id, username: user.username });

    // 비밀번호 해시 제외
    const { passwordHash, ...sanitizedUser } = user;

    return NextResponse.json(
      { success: true, data: sanitizedUser },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create user', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
