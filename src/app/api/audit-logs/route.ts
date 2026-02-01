import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditLogService } from '@/lib/services/userService';
import { logger } from '@/lib/logging';
import { z } from 'zod';

// Query params validation
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  userId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * GET /api/audit-logs - Get audit logs (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    // Admin only
    if (!token || token.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Validate query params
    const validation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      userId: searchParams.get('userId'),
      action: searchParams.get('action'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { page, limit, userId, action, from, to } = validation.data;
    const skip = (page - 1) * limit;

    const logs = await auditLogService.find({
      skip,
      take: limit,
      userId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    // Log this access
    logger.audit('AUDIT_LOGS_VIEWED', {
      userId: token.sub as string,
      action: 'view_audit_logs',
    });

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
