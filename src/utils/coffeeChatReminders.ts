import { CoffeeChatRecord, Profile } from '../types';

const DISMISSED_STORAGE_KEY = 'section_f_dismissed_coffee_reminders';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface PendingCoffeeReminder {
  profile: Profile;
  record: CoffeeChatRecord;
  hoursAgo: number;
}

/**
 * Returns coffee chats that have been in 'request_sent' status for 24+ hours
 * and have not been dismissed/snoozed in the current local storage session.
 */
export function getOverdueCoffeeChatReminders(
  profiles: Profile[],
  records: Record<string, CoffeeChatRecord>
): PendingCoffeeReminder[] {
  let dismissedUids: Record<string, number> = {};
  try {
    const raw = sessionStorage.getItem(DISMISSED_STORAGE_KEY);
    if (raw) dismissedUids = JSON.parse(raw);
  } catch (e) {
    dismissedUids = {};
  }

  const now = Date.now();
  const profileMap = new Map<string, Profile>();
  profiles.forEach((p) => profileMap.set(p.uid, p));

  const overdue: PendingCoffeeReminder[] = [];

  Object.values(records).forEach((rec) => {
    if (rec.status !== 'request_sent') return;

    // Check if dismissed recently (e.g. within last 6 hours)
    const dismissedAt = dismissedUids[rec.classmateUid];
    if (dismissedAt && now - dismissedAt < 6 * 60 * 60 * 1000) {
      return;
    }

    // Determine when the request was sent
    const requestedTimestamp = rec.requestedAt
      ? new Date(rec.requestedAt).getTime()
      : rec.updatedAt
      ? new Date(rec.updatedAt).getTime()
      : null;

    if (!requestedTimestamp || isNaN(requestedTimestamp)) return;

    const elapsedMs = now - requestedTimestamp;
    if (elapsedMs >= TWENTY_FOUR_HOURS_MS) {
      const profile = profileMap.get(rec.classmateUid);
      if (profile) {
        overdue.push({
          profile,
          record: rec,
          hoursAgo: Math.max(24, Math.floor(elapsedMs / (60 * 60 * 1000))),
        });
      }
    }
  });

  // Sort by oldest request first
  return overdue.sort((a, b) => b.hoursAgo - a.hoursAgo);
}

/**
 * Dismisses or snoozes a reminder for a classmate UID in the current session.
 */
export function dismissCoffeeChatReminder(classmateUid: string): void {
  try {
    let dismissedUids: Record<string, number> = {};
    const raw = sessionStorage.getItem(DISMISSED_STORAGE_KEY);
    if (raw) dismissedUids = JSON.parse(raw);
    dismissedUids[classmateUid] = Date.now();
    sessionStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(dismissedUids));
  } catch (e) {
    console.error('Failed to dismiss coffee reminder:', e);
  }
}

/**
 * Triggers a browser system notification if permissions are granted.
 */
export function triggerBrowserCoffeeNotification(
  reminder: PendingCoffeeReminder,
  onClick?: () => void
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(`Coffee Chat with ${reminder.profile.fullName}`, {
        body: `You sent an invite ${reminder.hoursAgo} hours ago. Tap to update the status!`,
        icon: reminder.profile.photoUrl || '/favicon.ico',
      });
      if (onClick) {
        notif.onclick = () => {
          window.focus();
          onClick();
          notif.close();
        };
      }
    } catch (e) {
      console.warn('System notification error:', e);
    }
  }
}

