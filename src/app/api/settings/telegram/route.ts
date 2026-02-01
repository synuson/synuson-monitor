import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { encrypt, decrypt, maskToken } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging';
import { z } from 'zod';

// Validation schema
const telegramSettingsSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
  enabled: z.boolean().default(false),
});

/**
 * GET /api/settings/telegram - Get Telegram settings (token masked)
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user settings from database
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: token.sub },
    });

    if (!userSettings || !userSettings.telegramBotToken) {
      return NextResponse.json({
        success: true,
        data: {
          botToken: '',
          chatId: '',
          enabled: false,
          configured: false,
        },
      });
    }

    // Decrypt and mask token for display
    let maskedToken = '';
    try {
      const decryptedToken = decrypt(userSettings.telegramBotToken);
      maskedToken = maskToken(decryptedToken);
    } catch {
      maskedToken = '****';
    }

    return NextResponse.json({
      success: true,
      data: {
        botToken: maskedToken,
        chatId: userSettings.telegramChatId || '',
        enabled: userSettings.notificationsEnabled,
        configured: true,
      },
    });
  } catch (error) {
    logger.error('Failed to get Telegram settings', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/telegram - Save Telegram settings (encrypted)
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

    const body = await request.json();

    // Validate input
    const validation = telegramSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { botToken, chatId, enabled } = validation.data;

    // Encrypt the bot token
    const encryptedToken = encrypt(botToken);

    // Upsert user settings
    await prisma.userSettings.upsert({
      where: { userId: token.sub },
      update: {
        telegramBotToken: encryptedToken,
        telegramChatId: chatId,
        notificationsEnabled: enabled,
      },
      create: {
        userId: token.sub,
        telegramBotToken: encryptedToken,
        telegramChatId: chatId,
        notificationsEnabled: enabled,
      },
    });

    // Audit log
    logger.audit('TELEGRAM_SETTINGS_UPDATED', {
      userId: token.sub,
      enabled,
      action: 'update',
    });

    return NextResponse.json({
      success: true,
      message: 'Telegram settings saved successfully',
    });
  } catch (error) {
    logger.error('Failed to save Telegram settings', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/telegram - Remove Telegram settings
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await prisma.userSettings.update({
      where: { userId: token.sub },
      data: {
        telegramBotToken: null,
        telegramChatId: null,
        notificationsEnabled: false,
      },
    });

    // Audit log
    logger.audit('TELEGRAM_SETTINGS_DELETED', {
      userId: token.sub,
      action: 'delete',
    });

    return NextResponse.json({
      success: true,
      message: 'Telegram settings removed',
    });
  } catch (error) {
    logger.error('Failed to delete Telegram settings', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete settings' },
      { status: 500 }
    );
  }
}
