import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging';

/**
 * POST /api/telegram/test - Send test message using stored credentials
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get settings from database
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: token.sub },
    });

    if (!userSettings?.telegramBotToken || !userSettings?.telegramChatId) {
      return NextResponse.json(
        { success: false, error: 'Telegram settings not configured' },
        { status: 400 }
      );
    }

    // Decrypt the bot token
    let botToken: string;
    try {
      botToken = decrypt(userSettings.telegramBotToken);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt bot token' },
        { status: 500 }
      );
    }

    const chatId = userSettings.telegramChatId;

    const text = `✅ *SYNUSON Monitor Test*

테스트 알림입니다.
Telegram 연동이 정상적으로 설정되었습니다.

🕐 ${new Date().toLocaleString('ko-KR')}`;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      }
    );

    const data = await response.json();

    if (data.ok) {
      logger.audit('TELEGRAM_TEST_SUCCESS', { userId: token.sub });
      return NextResponse.json({ success: true });
    } else {
      logger.warn('Telegram test failed', { userId: token.sub, error: data.description });
      return NextResponse.json(
        { success: false, error: data.description || 'Failed to send message' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Telegram test error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to Telegram API' },
      { status: 500 }
    );
  }
}
