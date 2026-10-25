import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  increment,
  Unsubscribe 
} from 'firebase/firestore';
import { getApp } from 'firebase/app';

export type AnalyticsEventType =
  | 'email_link_clicked'
  | 'login_started'
  | 'login_completed'
  | 'login_failed'
  | 'login_abandoned'
  | 'guest_mode_entered'
  | 'guest_mode_converted'
  | 'view_coffee_chat'
  | 'create_coffee_invite'
  | 'view_atlas'
  | 'view_spotlight'
  | 'view_deck';

export interface AnalyticsEventRecord {
  id: string;
  eventType: AnalyticsEventType;
  timestamp: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

export interface AnalyticsSummary {
  emailClicks: number;
  loginStarted: number;
  loginCompleted: number;
  loginFailed: number;
  loginAbandoned: number;
  guestModeEntered: number;
  guestModeConverted: number;
  coffeeChatsViewed: number;
  coffeeInvitesSent: number;
  atlasViewed: number;
  spotlightViewed: number;
  deckViewed: number;
  loginErrors?: Record<string, number>;
  lastUpdated?: string;
}

const DEFAULT_SUMMARY: AnalyticsSummary = {
  emailClicks: 0,
  loginStarted: 0,
  loginCompleted: 0,
  loginFailed: 0,
  loginAbandoned: 0,
  guestModeEntered: 0,
  guestModeConverted: 0,
  coffeeChatsViewed: 0,
  coffeeInvitesSent: 0,
  atlasViewed: 0,
  spotlightViewed: 0,
  deckViewed: 0,
  loginErrors: {},
};

// Generate persistent session id per browser session
function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem('secf_analytics_sid');
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem('secf_analytics_sid', sid);
    }
    return sid;
  } catch {
    return 'anonymous_session';
  }
}

/**
 * Record an analytics event to Firestore
 */
export async function trackEvent(
  eventType: AnalyticsEventType, 
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const db = getFirestore(getApp());
    const now = new Date().toISOString();
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessionId = getSessionId();

    const record: AnalyticsEventRecord = {
      id: eventId,
      eventType,
      timestamp: now,
      metadata: {
        ...metadata,
        url: window.location.pathname + window.location.search,
      },
      sessionId,
    };

    // 1. Write individual event log
    const eventRef = doc(db, 'analytics_events', eventId);
    await setDoc(eventRef, record);

    // 2. Atomically update summary counter
    const summaryRef = doc(db, 'app_analytics', 'summary');
    const updatePayload: Record<string, any> = {
      lastUpdated: now,
    };

    switch (eventType) {
      case 'email_link_clicked':
        updatePayload.emailClicks = increment(1);
        break;
      case 'login_started':
        updatePayload.loginStarted = increment(1);
        break;
      case 'login_completed':
        updatePayload.loginCompleted = increment(1);
        break;
      case 'login_failed':
        updatePayload.loginFailed = increment(1);
        if (metadata?.errorCode) {
          const sanitizedCode = String(metadata.errorCode).replace(/[^a-zA-Z0-9_-]/g, '_');
          updatePayload[`loginErrors.${sanitizedCode}`] = increment(1);
        }

        // Trigger SMS incident alert to admin if enabled
        try {
          const smsEnabled = typeof window !== 'undefined' && localStorage.getItem('secf_sms_auto_alert') === 'true';
          const adminPhone = typeof window !== 'undefined' ? localStorage.getItem('secf_admin_phone') : null;
          const adminCarrier = (typeof window !== 'undefined' ? localStorage.getItem('secf_admin_carrier') : null) || 'auto';
          const lastAlert = Number((typeof window !== 'undefined' ? sessionStorage.getItem('secf_last_sms_alert') : null) || '0');
          const nowMs = Date.now();

          if (smsEnabled && adminPhone && (nowMs - lastAlert > 180000)) { // 3-minute throttle
            sessionStorage.setItem('secf_last_sms_alert', String(nowMs));
            fetch('/api/send-admin-sms-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phoneNumber: adminPhone,
                carrier: adminCarrier,
                alertType: 'login_failed',
                classmateName: metadata?.name || metadata?.displayName,
                classmateEmail: metadata?.email,
                errorCode: metadata?.errorCode,
              })
            }).catch(() => {});
          }
        } catch {
          // Ignore non-critical storage access errors
        }
        break;
      case 'login_abandoned':
        updatePayload.loginAbandoned = increment(1);
        break;
      case 'guest_mode_entered':
        updatePayload.guestModeEntered = increment(1);
        break;
      case 'guest_mode_converted':
        updatePayload.guestModeConverted = increment(1);
        break;
      case 'view_coffee_chat':
        updatePayload.coffeeChatsViewed = increment(1);
        break;
      case 'create_coffee_invite':
        updatePayload.coffeeInvitesSent = increment(1);
        break;
      case 'view_atlas':
        updatePayload.atlasViewed = increment(1);
        break;
      case 'view_spotlight':
        updatePayload.spotlightViewed = increment(1);
        break;
      case 'view_deck':
        updatePayload.deckViewed = increment(1);
        break;
    }

    await setDoc(summaryRef, updatePayload, { merge: true });
  } catch (err) {
    console.warn('[Analytics] Could not log event:', err);
  }
}

/**
 * Subscribe to the real-time aggregated summary document
 */
export function subscribeToAnalyticsSummary(
  onUpdate: (summary: AnalyticsSummary) => void
): Unsubscribe {
  try {
    const db = getFirestore(getApp());
    const docRef = doc(db, 'app_analytics', 'summary');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          onUpdate({
            ...DEFAULT_SUMMARY,
            ...data,
            loginErrors: data.loginErrors || {},
          } as AnalyticsSummary);
        } else {
          onUpdate(DEFAULT_SUMMARY);
        }
      },
      (err) => {
        console.warn('[Analytics] subscribeToAnalyticsSummary error:', err);
        onUpdate(DEFAULT_SUMMARY);
      }
    );
  } catch (err) {
    console.warn('[Analytics] subscribe error:', err);
    return () => {};
  }
}

/**
 * Subscribe to the recent events feed in real-time
 */
export function subscribeToRecentEvents(
  onUpdate: (events: AnalyticsEventRecord[]) => void,
  limitCount = 20
): Unsubscribe {
  try {
    const db = getFirestore(getApp());
    const colRef = collection(db, 'analytics_events');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(limitCount));

    return onSnapshot(
      q,
      (snap) => {
        const events: AnalyticsEventRecord[] = [];
        snap.forEach((d) => {
          events.push(d.data() as AnalyticsEventRecord);
        });
        onUpdate(events);
      },
      (err) => {
        console.warn('[Analytics] subscribeToRecentEvents error:', err);
        onUpdate([]);
      }
    );
  } catch (err) {
    console.warn('[Analytics] subscribeToRecentEvents error:', err);
    return () => {};
  }
}

