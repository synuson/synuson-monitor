// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Check if notifications are supported and permitted
export function canSendNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// Send browser notification
export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    onClick?: () => void;
  }
): Notification | null {
  if (!canSendNotifications()) {
    return null;
  }

  const notification = new Notification(title, {
    body: options?.body,
    icon: options?.icon || '/favicon.ico',
    tag: options?.tag,
    requireInteraction: options?.requireInteraction,
  });

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }

  return notification;
}

// Send problem notification
export function sendProblemBrowserNotification(problem: {
  name: string;
  host?: string;
  severity: string;
  eventid: string;
}): Notification | null {
  const severityLabels: Record<string, string> = {
    '5': '🚨 Disaster',
    '4': '🔴 High',
    '3': '🟠 Average',
    '2': '🟡 Warning',
    '1': 'ℹ️ Information',
  };

  return sendBrowserNotification(`${severityLabels[problem.severity] || 'Alert'}: ${problem.name}`, {
    body: problem.host ? `Host: ${problem.host}` : undefined,
    tag: `problem-${problem.eventid}`,
    requireInteraction: problem.severity === '5' || problem.severity === '4',
    onClick: () => {
      // Navigate to problems page
      window.location.href = '/problems';
    },
  });
}

// Send recovery notification
export function sendRecoveryBrowserNotification(problem: {
  name: string;
  host?: string;
  eventid: string;
}): Notification | null {
  return sendBrowserNotification(`✅ Resolved: ${problem.name}`, {
    body: problem.host ? `Host: ${problem.host}` : 'Problem has been resolved',
    tag: `recovery-${problem.eventid}`,
  });
}

// Play notification sound
export function playNotificationSound(type: 'alert' | 'warning' | 'critical' = 'alert') {
  // Create audio context for sound
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Different frequencies for different alert types
  const frequencies: Record<string, number[]> = {
    alert: [440, 550],
    warning: [440, 440, 550],
    critical: [880, 660, 880, 660],
  };

  const freqs = frequencies[type];
  const time = audioContext.currentTime;

  gainNode.gain.setValueAtTime(0.3, time);

  freqs.forEach((freq, i) => {
    oscillator.frequency.setValueAtTime(freq, time + i * 0.2);
  });

  oscillator.start(time);
  oscillator.stop(time + freqs.length * 0.2);
}
