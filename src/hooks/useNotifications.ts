import { useState, useEffect, useCallback } from 'react';

const PERMISSION_BANNER_KEY = 'lumen-notif-banner-dismissed';
const NOTIFICATION_ENABLED_KEY = 'lumen-notif-enabled';

// How many ms until 8 PM tonight (or tomorrow if already past 8 PM)
function msUntilNextReminder(hour = 20): number {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    // Already past 8 PM today — schedule for tomorrow
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

async function showLocalNotification(loggedToday: boolean) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const title = loggedToday ? 'Lumen — Keep it up! 🔥' : 'Lumen — Don\'t forget to log!';
  const body = loggedToday
    ? 'Great job logging today. Tap to check your balance.'
    : 'You haven\'t logged any expenses yet today. Quick tap to add one.';
  registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/favicon.png',
    tag: 'lumen-daily-reminder',
    renotify: true,
    data: { url: '/?action=quick-log' },
  } as NotificationOptions);
}

interface UseNotificationsReturn {
  /** Current Notification API permission state */
  permissionState: NotificationPermission | 'unsupported';
  /** Whether the one-time permission banner should be shown */
  showBanner: boolean;
  /** Call when user clicks "Enable reminders" in the banner */
  requestPermission: () => Promise<void>;
  /** Call when user dismisses the banner without enabling */
  dismissBanner: () => void;
}

/**
 * Manages daily 8 PM local push notifications for expense logging reminders.
 * Entirely local — no server, no VAPID keys needed.
 */
export function useNotifications(
  isAuthenticated: boolean,
  loggedToday: boolean
): UseNotificationsReturn {
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [showBanner, setShowBanner] = useState(false);

  // Decide whether to show the one-time permission banner
  useEffect(() => {
    if (!isAuthenticated) return;
    if (permissionState === 'unsupported' || permissionState === 'denied') return;
    if (permissionState === 'granted') return; // Already enabled
    const dismissed = localStorage.getItem(PERMISSION_BANNER_KEY) === 'true';
    if (!dismissed) {
      // Small delay so it doesn't appear on the very first render
      const t = setTimeout(() => setShowBanner(true), 4000);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, permissionState]);

  // Schedule the daily reminder whenever permission is granted
  useEffect(() => {
    if (permissionState !== 'granted') return;
    if (localStorage.getItem(NOTIFICATION_ENABLED_KEY) !== 'true') return;

    let timerId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = msUntilNextReminder(20); // 8 PM
      timerId = setTimeout(async () => {
        await showLocalNotification(loggedToday);
        scheduleNext(); // Reschedule for the next day
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timerId);
  }, [permissionState, loggedToday]);

  // Also listen for SW messages (e.g., notification click → open quick-log)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_QUICK_LOG') {
        // Dispatch a custom event that App.tsx listens to
        window.dispatchEvent(new CustomEvent('lumen:open-quick-log'));
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermissionState(result);
    if (result === 'granted') {
      localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
    }
    localStorage.setItem(PERMISSION_BANNER_KEY, 'true');
    setShowBanner(false);
  }, []);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(PERMISSION_BANNER_KEY, 'true');
    setShowBanner(false);
  }, []);

  return { permissionState, showBanner, requestPermission, dismissBanner };
}
