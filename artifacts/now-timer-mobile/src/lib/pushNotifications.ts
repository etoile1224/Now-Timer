import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─────────────────────────────────────────────────────────
// Local notification scheduling for timer (background NOW!)
// ─────────────────────────────────────────────────────────

const TIMER_NOTIFICATION_PREFIX = 'timer-';

export type TimerNotificationKind =
  | 'work-end'      // 집중 끝 → NOW! 시작
  | 'work-lv2'      // NOW! 무시 → Lv2
  | 'work-lv3'      // NOW! 무시 → Lv3
  | 'break-end'     // 휴식 끝 → 복귀 알림
  | 'break-lv2'
  | 'break-lv3';

interface TimerNotificationContent {
  title: string;
  body: string;
}

const CONTENT: Record<TimerNotificationKind, TimerNotificationContent> = {
  'work-end':  { title: 'NOW!',         body: '집중 시간 끝났어요. 지금 휴식하세요!' },
  'work-lv2':  { title: 'NOW! 무시 중',  body: '아직 휴식 안 했어요. 지금 당장!' },
  'work-lv3':  { title: 'NOW!! 지금 당장!!', body: '계속 무시하면 친구들에게 알림이 가요.' },
  'break-end': { title: '돌아올 시간',    body: '휴식 끝났어요. 다음 세션 시작!' },
  'break-lv2': { title: '복귀 무시 중',   body: '아직 시작 안 했어요. 지금!' },
  'break-lv3': { title: '복귀!! 지금!!',   body: '계속 무시하면 친구들에게 알림이 가요.' },
};

/**
 * Ensure notification permission is granted. Returns true if granted.
 * Safe to call on simulator/web — local notifications work without a push token.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('[notif] Permission not granted');
      return false;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'NOW! Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
    return true;
  } catch (err) {
    console.warn('[notif] permission check failed:', err);
    return false;
  }
}

/**
 * Schedule a single local notification `delaySeconds` from now.
 * Returns the system identifier (so it can be cancelled later).
 */
export async function scheduleTimerNotification(
  kind: TimerNotificationKind,
  delaySeconds: number,
): Promise<string | null> {
  if (delaySeconds <= 0) return null;
  const { title, body } = CONTENT[kind];
  try {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `${TIMER_NOTIFICATION_PREFIX}${kind}-${Date.now()}`,
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        // Custom data so a tap handler can route to the right screen
        data: { kind, source: 'timer' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(delaySeconds)),
        repeats: false,
      },
    });
    return id;
  } catch (err) {
    console.warn('[notif] schedule failed:', err);
    return null;
  }
}

/**
 * Cancel all timer-related notifications (uses prefix match against scheduled list).
 */
export async function cancelAllTimerNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const targets = scheduled.filter((n) =>
      n.identifier.startsWith(TIMER_NOTIFICATION_PREFIX),
    );
    await Promise.all(
      targets.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier),
      ),
    );
  } catch (err) {
    console.warn('[notif] cancel-all failed:', err);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[push] Push notifications only work on physical devices');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Ask for permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permission not granted');
    return null;
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'NOW! Timer',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    console.log('[push] Token:', tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.warn('[push] Failed to get push token:', err);
    return null;
  }
}
