/**
 * ChatOps API Route
 * 자연어 쿼리를 처리하는 API 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server';
import { processQuery } from '@/lib/chatops/engine';
import { getSuggestions } from '@/lib/chatops/parser';

export const dynamic = 'force-dynamic';

// POST: 쿼리 처리
// Note: Authentication is handled by client-side store for now
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: '쿼리를 입력해주세요.',
          type: 'error',
        },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: '쿼리가 너무 깁니다. (최대 500자)',
          type: 'error',
        },
        { status: 400 }
      );
    }

    const response = await processQuery(trimmedQuery);

    return NextResponse.json(response);
  } catch (error) {
    console.error('ChatOps error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.',
        type: 'error',
      },
      { status: 500 }
    );
  }
}

// GET: 자동완성 제안
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get('q') || '';

    const suggestions = getSuggestions(input);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      {
        success: false,
        suggestions: [],
      },
      { status: 500 }
    );
  }
}
