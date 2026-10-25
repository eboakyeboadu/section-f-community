import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { triggerNotification, getNotificationPermission } from './pushNotificationService';
import { Profile } from '../types';

export interface PhotoReminderRecord {
  uid: string;
  userEmail?: string;
  initialSignInAt: number; // Timestamp in ms
  reminder2hSentAt?: number | null;
  reminder3dSentAt?: number | null;
  hasPhoto: boolean;
  status: 'pending' | 'completed' | 'exhausted';
  updatedAt: string;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function getLocalKey(uid: string): string {
  return `section_f_photo_reminder_${uid}`;
}

/**
 * Record initial sign in / claim when user has no photo
 */
export async function registerUserPhotoStatus(
  uid: string,
  userEmail?: string,
  photoUrl?: string
): Promise<void> {
  if (!uid) return;
  const hasPhoto = Boolean(photoUrl && photoUrl.trim() !== '');

  const localKey = getLocalKey(uid);
  let existing: PhotoReminderRecord | null = null;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) existing = JSON.parse(raw);
  } catch (e) {
    // Ignore parse error
  }

  const now = Date.now();
  const record: PhotoReminderRecord = {
    uid,
    userEmail: userEmail || existing?.userEmail || '',
    initialSignInAt: existing?.initialSignInAt || now,
    reminder2hSentAt: existing?.reminder2hSentAt || null,
    reminder3dSentAt: existing?.reminder3dSentAt || null,
    hasPhoto,
    status: hasPhoto ? 'completed' : (existing?.status || 'pending'),
    updatedAt: new Date().toISOString()
  };

  // If user already has a photo, mark completed immediately
  if (hasPhoto) {
    record.status = 'completed';
  }

  try {
    localStorage.setItem(localKey, JSON.stringify(record));
    const safeDocId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(doc(db, 'photo_reminders', safeDocId), record, { merge: true });
  } catch (err) {
    console.warn('Could not persist photo reminder status:', err);
  }
}

/**
 * Instantly disarm and complete reminders when user uploads a photo
 */
export async function markUserPhotoUploaded(uid: string): Promise<void> {
  if (!uid) return;
  const localKey = getLocalKey(uid);

  try {
    const raw = localStorage.getItem(localKey);
    const existing: Partial<PhotoReminderRecord> = raw ? JSON.parse(raw) : {};
    const updated: PhotoReminderRecord = {
      uid,
      userEmail: existing.userEmail || '',
      initialSignInAt: existing.initialSignInAt || Date.now(),
      reminder2hSentAt: existing.reminder2hSentAt || null,
      reminder3dSentAt: existing.reminder3dSentAt || null,
      hasPhoto: true,
      status: 'completed',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(localKey, JSON.stringify(updated));

    const safeDocId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(doc(db, 'photo_reminders', safeDocId), updated, { merge: true });
  } catch (err) {
    console.warn('Could not mark photo reminder completed:', err);
  }
}

/**
 * Check if the 2-hour or 3-day reminder is due for the signed-in user, and dispatch it if eligible
 */
export async function checkAndTriggerDuePhotoReminders(
  profile: Profile | null,
  onOpenPhotoModal?: () => void
): Promise<{ triggered: boolean; step?: '2h' | '3d' }> {
  if (!profile || !profile.uid) return { triggered: false };

  // If user already has a photo, ensure marked completed
  if (profile.photoUrl && profile.photoUrl.trim() !== '') {
    await markUserPhotoUploaded(profile.uid);
    return { triggered: false };
  }

  const uid = profile.uid;
  const localKey = getLocalKey(uid);
  let record: PhotoReminderRecord | null = null;

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) record = JSON.parse(raw);
  } catch (e) {
    // ignore
  }

  // If no record exists, initialize one
  if (!record) {
    await registerUserPhotoStatus(uid, profile.email || profile.authEmail, profile.photoUrl);
    return { triggered: false };
  }

  // If already completed or exhausted all 2 reminders, do nothing
  if (record.status === 'completed' || record.status === 'exhausted') {
    return { triggered: false };
  }

  const now = Date.now();
  const elapsed = now - record.initialSignInAt;

  // 1. Check 2-Hour Reminder
  if (elapsed >= TWO_HOURS_MS && !record.reminder2hSentAt) {
    record.reminder2hSentAt = now;
    record.updatedAt = new Date().toISOString();

    await triggerNotification('📸 Complete your Section F card', {
      body: 'Add a headshot so your classmates recognize you in the section directory!',
      tag: 'section-f-photo-2h',
      url: '/?action=upload-photo'
    });

    try {
      localStorage.setItem(localKey, JSON.stringify(record));
      const safeDocId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(doc(db, 'photo_reminders', safeDocId), record, { merge: true });
    } catch (err) {
      console.warn('Failed to update 2h reminder state:', err);
    }

    return { triggered: true, step: '2h' };
  }

  // 2. Check 3-Day Reminder (Final reminder, then stop)
  if (elapsed >= THREE_DAYS_MS && !record.reminder3dSentAt) {
    record.reminder3dSentAt = now;
    record.status = 'exhausted'; // Stop after 3-day reminder
    record.updatedAt = new Date().toISOString();

    await triggerNotification('👋 Section F Photo Reminder', {
      body: 'Your Section F card is missing a photo. Tap to upload one in 10 seconds.',
      tag: 'section-f-photo-3d',
      url: '/?action=upload-photo'
    });

    try {
      localStorage.setItem(localKey, JSON.stringify(record));
      const safeDocId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(doc(db, 'photo_reminders', safeDocId), record, { merge: true });
    } catch (err) {
      console.warn('Failed to update 3d reminder state:', err);
    }

    return { triggered: true, step: '3d' };
  }

  return { triggered: false };
}

/**
 * Preview / Test helper to verify the notification experience immediately
 */
export async function sendTestPhotoReminder(step: '2h' | '3d' = '2h'): Promise<boolean> {
  const is2h = step === '2h';
  const title = is2h ? '📸 Complete your Section F card' : '👋 Section F Photo Reminder';
  const body = is2h
    ? 'Add a headshot so your classmates recognize you in the section directory!'
    : 'Your Section F card is missing a photo. Tap to upload one in 10 seconds.';

  return await triggerNotification(title, {
    body,
    tag: `section-f-photo-${step}-test`,
    url: '/?action=upload-photo'
  });
}

