interface TelegramConfig {
  botToken: string;
  chatId: string;
}

interface TelegramMessage {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  timestamp?: Date;
}

// Send message via Telegram Bot API
export async function sendTelegramMessage(config: TelegramConfig, msg: TelegramMessage): Promise<boolean> {
  if (!config.botToken || !config.chatId) {
    console.error('Telegram config is incomplete');
    return false;
  }

  const severityEmoji: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };

  const emoji = severityEmoji[msg.severity || 'info'];
  const time = (msg.timestamp || new Date()).toLocaleString('ko-KR');

  const text = `${emoji} *${escapeMarkdown(msg.title)}*

${escapeMarkdown(msg.message)}

🕐 ${time}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      console.error(`Telegram API error: HTTP ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data?.ok === true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

// Send test notification
export async function sendTestNotification(config: TelegramConfig): Promise<boolean> {
  return sendTelegramMessage(config, {
    title: 'SYNUSON Monitor Test',
    message: '테스트 알림입니다. Telegram 연동이 정상적으로 설정되었습니다.',
    severity: 'info',
    timestamp: new Date(),
  });
}

// Send problem notification
export async function sendProblemNotification(
  config: TelegramConfig,
  problem: {
    name: string;
    host?: string;
    severity: string;
  }
): Promise<boolean> {
  const severityLabels: Record<string, string> = {
    '5': 'Disaster',
    '4': 'High',
    '3': 'Average',
    '2': 'Warning',
    '1': 'Information',
  };

  const severityMap: Record<string, 'info' | 'warning' | 'critical'> = {
    '5': 'critical',
    '4': 'critical',
    '3': 'warning',
    '2': 'warning',
    '1': 'info',
  };

  return sendTelegramMessage(config, {
    title: `[${severityLabels[problem.severity] || 'Alert'}] ${problem.name}`,
    message: problem.host ? `Host: ${problem.host}` : 'Host information unavailable',
    severity: severityMap[problem.severity] || 'info',
    timestamp: new Date(),
  });
}

// Send recovery notification
export async function sendRecoveryNotification(
  config: TelegramConfig,
  problem: {
    name: string;
    host?: string;
  }
): Promise<boolean> {
  return sendTelegramMessage(config, {
    title: `[Resolved] ${problem.name}`,
    message: `✅ 문제가 해결되었습니다.\n${problem.host ? `Host: ${problem.host}` : ''}`,
    severity: 'info',
    timestamp: new Date(),
  });
}

// Escape Markdown special characters
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// Validate Telegram configuration
export async function validateTelegramConfig(config: TelegramConfig): Promise<{ valid: boolean; error?: string }> {
  if (!config.botToken) {
    return { valid: false, error: 'Bot token is required' };
  }

  if (!config.chatId) {
    return { valid: false, error: 'Chat ID is required' };
  }

  try {
    // Test by getting bot info
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      return { valid: false, error: 'Invalid bot token' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Failed to connect to Telegram API' };
  }
}
