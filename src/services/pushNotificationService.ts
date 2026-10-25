// Native, zero-dependency Web Push and PWA Service Worker helper
import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface PushSubscriptionRecord {
  uid: string;
  endpoint: string;
  authKey?: string;
  p256dhKey?: string;
  userAgent: string;
  isStandalone: boolean;
  enabled?: boolean;
  updatedAt: string;
}

export const STORAGE_PUSH_ENABLED_KEY = 'section_f_push_enabled';

/**
 * Check if push notifications are actively enabled by the user in this app
 */
export function isPushNotificationsEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  const pref = localStorage.getItem(STORAGE_PUSH_ENABLED_KEY);
  return pref !== 'false';
}

/**
 * Check if the app is currently running as a standalone PWA added to the home screen
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if current device is iOS / iPadOS
 */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Check current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register the native service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Enable notifications: prompts browser permission, stores active preference, and syncs to Firestore
 */
export async function enablePushNotifications(userUid?: string): Promise<{
  granted: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, error: 'Push notifications are not supported on this browser.' };
  }

  // iOS Safari constraint check: Web Push on iOS requires "Add to Home Screen" first
  if (isIosDevice() && !isStandalonePwa()) {
    return {
      granted: false,
      error: 'On iPhone/iPad, tap Share -> "Add to Home Screen" first to enable notifications.'
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, error: 'Notification permission was not granted in your browser.' };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PUSH_ENABLED_KEY, 'true');
    }

    // Register Service Worker
    const reg = await registerServiceWorker();

    // If user is signed in, save subscription state in Firestore
    const uid = userUid || auth.currentUser?.uid;
    if (uid) {
      try {
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        const subRecord: PushSubscriptionRecord = {
          uid,
          endpoint: sub?.endpoint || 'local_granted',
          userAgent: navigator.userAgent,
          isStandalone: isStandalonePwa(),
          enabled: true,
          updatedAt: new Date().toISOString()
        };

        if (sub) {
          const rawKey = sub.getKey ? sub.getKey('p256dh') : null;
          const rawAuth = sub.getKey ? sub.getKey('auth') : null;
          if (rawKey) {
            subRecord.p256dhKey = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
          }
          if (rawAuth) {
            subRecord.authKey = btoa(String.fromCharCode(...new Uint8Array(rawAuth)));
          }
        }

        const safeDocId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
        await setDoc(doc(db, 'push_subscriptions', safeDocId), subRecord, { merge: true });
      } catch (err) {
        console.warn('Could not persist push subscription record:', err);
      }
    }

    return { granted: true };
  } catch (err: any) {
    console.error('Notification permission error:', err);
    return { granted: false, error: err?.message || 'Failed to request notification permission.' };
  }
}

/**
 * Backward compatibility alias
 */
export const requestNotificationPermission = enablePushNotifications;

/**
 * Disable notifications: marks preference as muted and updates Firestore
 */
export async function disablePushNotifications(userUid?: string): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_PUSH_ENABLED_KEY, 'false');
  }

  const uid = userUid || auth.currentUser?.uid;
  if (uid) {
    try {
      const safeDocId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(doc(db, 'push_subscriptions', safeDocId), {
        uid,
        enabled: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Could not persist disabled push state:', err);
    }
  }
}

/**
 * Trigger an immediate notification (e.g. for event or photo reminder) via Service Worker or Notification API
 */
export async function triggerNotification(title: string, options: {
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}): Promise<boolean> {
  if (!isPushNotificationsEnabled()) {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body: options.body,
          icon: options.icon || '/icon-192.png',
          badge: '/icon-192.png',
          tag: options.tag || 'section-f-reminder',
          renotify: true,
          data: {
            url: options.url || '/?action=upload-photo'
          }
        } as any);
        return true;
      }
    }

    // Fallback to in-page Notification constructor if service worker not ready
    new Notification(title, {
      body: options.body,
      icon: options.icon || '/icon-192.png',
      tag: options.tag || 'section-f-reminder',
    });
    return true;
  } catch (err) {
    console.warn('Could not dispatch notification:', err);
    return false;
  }
}

