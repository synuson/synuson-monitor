import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { userService, auditLogService } from '@/lib/services/userService';
import { changePasswordSchema } from '@/lib/validation';
import { logger } from '@/lib/logging';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['admin', 'operator', 'viewer']).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id] - 단일 사용자 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = await getToken({ req: request });
    const { id } = await params;

    // 본인 정보 조회 또는 admin/operator만 다른 사용자 조회 가능
    const isOwnProfile = token?.sub === id;
    const isAdmin = ['admin', 'operator'].includes(token?.role as string);

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const user = await userService.findById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 비밀번호 해시 제외
    const { passwordHash, ...sanitizedUser } = user;

    return NextResponse.json({ success: true, data: sanitizedUser });
  } catch (error) {
    logger.error('Failed to fetch user', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id] - 사용자 정보 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const token = await getToken({ req: request });
    const { id } = await params;

    // 권한 확인
    const isOwnProfile = token?.sub === id;
    const isAdmin = token?.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 비밀번호 변경인 경우
    if (body.currentPassword && body.newPassword) {
      const validation = changePasswordSchema.safeParse(body);
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

      try {
        await userService.changePassword(
          id,
          validation.data.currentPassword,
          validation.data.newPassword
        );

        // 감사 로그
        await auditLogService.log({
          userId: token?.sub as string,
          action: 'change_password',
          target: `user:${id}`,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        logger.info('Password changed', { userId: id });

        return NextResponse.json({
          success: true,
          message: 'Password changed successfully',
        });
      } catch (err) {
        return NextResponse.json(
          { success: false, error: err instanceof Error ? err.message : 'Password change failed' },
          { status: 400 }
        );
      }
    }

    // 일반 정보 수정
    const validation = updateUserSchema.safeParse(body);
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

    // 역할 변경은 admin만 가능
    if (validation.data.role && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only admin can change user roles' },
        { status: 403 }
      );
    }

    // isActive 변경은 admin만 가능하며, 자기 자신은 비활성화 불가
    if (validation.data.isActive !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only admin can change user status' },
          { status: 403 }
        );
      }
      if (isOwnProfile && validation.data.isActive === false) {
        return NextResponse.json(
          { success: false, error: 'Cannot deactivate your own account' },
          { status: 400 }
        );
      }
    }

    const user = await userService.update(id, validation.data);

    // 감사 로그
    await auditLogService.log({
      userId: token?.sub as string,
      action: 'update_user',
      target: `user:${id}`,
      details: validation.data,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    logger.info('User updated', { userId: id, changes: validation.data });

    const { passwordHash, ...sanitizedUser } = user;

    return NextResponse.json({ success: true, data: sanitizedUser });
  } catch (error) {
    logger.error('Failed to update user', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - 사용자 삭제
 * 권한: admin
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const token = await getToken({ req: request });
    const { id } = await params;

    // admin만 삭제 가능
    if (token?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 자기 자신 삭제 불가
    if (token.sub === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await userService.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    await userService.delete(id);

    // 감사 로그
    await auditLogService.log({
      userId: token.sub as string,
      action: 'delete_user',
      target: `user:${id}`,
      details: { username: user.username },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    logger.info('User deleted', { userId: id, username: user.username });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete user', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
