import { NextRequest, NextResponse } from 'next/server';

// Note: Authentication is handled by client-side store for now
export async function POST(request: NextRequest) {
  try {
    const { botToken, chatId } = await request.json();

    if (!botToken || !chatId) {
      return NextResponse.json(
        { success: false, error: 'Bot token and chat ID are required' },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: data.description || 'Failed to send message' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Telegram test error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to Telegram API' },
      { status: 500 }
    );
  }
}
