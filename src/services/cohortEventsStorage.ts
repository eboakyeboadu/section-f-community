import { SectionCohortEvent } from '../types';
import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Unsubscribe 
} from 'firebase/firestore';

const STORAGE_KEY = 'section_f_cohort_events_v2';
const LEGACY_STORAGE_KEY = 'section_f_cohort_events';
const PARTIFUL_GROUP_KEY = 'section_f_partiful_group_url';

// Default empty events list - removing all inaccurate placeholder/mock events as requested
export const DEFAULT_SECTION_EVENTS: SectionCohortEvent[] = [];

// List of deprecated placeholder event IDs to purge from any user's local storage
const DEPRECATED_MOCK_IDS = new Set([
  'evt-welcome-pub',
  'evt-case-prep',
  'evt-international-potluck',
  'evt-sunday-run',
  'evt-cohort-trivia'
]);

/**
 * Clean up legacy mock events from localStorage and retrieve any user-created custom events
 */
export function getStoredCohortEvents(): SectionCohortEvent[] {
  try {
    // Check v2 first
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        return parsed.filter(e => e && e.id && !DEPRECATED_MOCK_IDS.has(e.id));
      }
    }

    // Clean up v1 legacy if exists
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const parsedLegacy = JSON.parse(rawLegacy);
      if (Array.isArray(parsedLegacy)) {
        const cleaned = parsedLegacy.filter(e => e && e.id && !DEPRECATED_MOCK_IDS.has(e.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return cleaned;
      }
    }

    return [];
  } catch (e) {
    console.error('Failed to parse cohort events from local storage:', e);
    return [];
  }
}

/**
 * Save events locally to localStorage
 */
function setStoredCohortEvents(events: SectionCohortEvent[]) {
  try {
    const cleaned = events.filter(e => e && e.id && !DEPRECATED_MOCK_IDS.has(e.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to write cohort events to local storage:', e);
  }
}

export const DEFAULT_PARTIFUL_GROUP_URL = 'https://partiful.com/co/2hYMHgQJeAQjTks0WNsS';

/**
 * Get the Section Partiful Group URL
 */
export function getPartifulGroupUrl(): string {
  try {
    const val = localStorage.getItem(PARTIFUL_GROUP_KEY);
    if (!val || val === 'https://partiful.com' || val === 'https://partiful.com/') {
      return DEFAULT_PARTIFUL_GROUP_URL;
    }
    return val;
  } catch {
    return DEFAULT_PARTIFUL_GROUP_URL;
  }
}

/**
 * Set the Section Partiful Group URL
 */
export function setPartifulGroupUrl(url: string): void {
  try {
    if (url && url.trim()) {
      localStorage.setItem(PARTIFUL_GROUP_KEY, url.trim());
    }
  } catch (e) {
    console.error('Failed to save Partiful group URL:', e);
  }
}

/**
 * Subscribe in real-time to cohort events from Firestore (shared with everyone in Section F)
 * Falls back seamlessly to locally stored events if offline or while loading.
 */
export function subscribeCohortEvents(
  onEventsUpdate: (events: SectionCohortEvent[]) => void
): Unsubscribe {
  const path = 'cohort_events';
  
  // Provide immediate local cache first
  const initialLocal = getStoredCohortEvents();
  onEventsUpdate(initialLocal);

  try {
    const colRef = collection(db, path);
    // Listen to changes in real-time
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const events: SectionCohortEvent[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SectionCohortEvent;
          if (data && data.id && !DEPRECATED_MOCK_IDS.has(data.id)) {
            events.push({
              ...data,
              id: docSnap.id,
            });
          }
        });

        // Merge any locally created events that might not have reached Firestore
        const localOnly = getStoredCohortEvents().filter(
          loc => !events.some(rem => rem.id === loc.id)
        );
        const combined = [...events, ...localOnly];

        // Sort by date ascending (soonest first)
        combined.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        setStoredCohortEvents(combined);
        onEventsUpdate(combined);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        // Fall back to local storage
        onEventsUpdate(getStoredCohortEvents());
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Falling back to local events storage:', error);
    onEventsUpdate(getStoredCohortEvents());
    return () => {};
  }
}

/**
 * Save an event to Firestore so it is shared with all classmates in Section F
 */
export async function saveCohortEvent(
  event: Omit<SectionCohortEvent, 'id' | 'createdAt'>
): Promise<SectionCohortEvent> {
  // Generate safe document ID matching ^[a-zA-Z0-9_\-]+$
  const safeId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const nowIso = new Date().toISOString();

  const newEvent: SectionCohortEvent = {
    id: safeId,
    title: event.title.trim(),
    date: event.date,
    time: event.time,
    description: event.description ? event.description.trim() : '',
    type: event.type || 'social',
    location: event.location ? event.location.trim() : '',
    partifulUrl: event.partifulUrl ? event.partifulUrl.trim() : '',
    createdAt: nowIso,
    createdByUid: event.createdByUid || auth.currentUser?.uid || '',
    createdByName: event.createdByName || auth.currentUser?.displayName || 'Section F Member',
  };

  // Optimistically update local storage
  const current = getStoredCohortEvents();
  const updated = [newEvent, ...current.filter(e => e.id !== safeId)];
  setStoredCohortEvents(updated);

  // Persist to Firestore (strictly defined values only, no undefined)
  const path = `cohort_events/${safeId}`;
  try {
    const docRef = doc(db, 'cohort_events', safeId);
    const firestoreData: Record<string, any> = {
      id: newEvent.id,
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      description: newEvent.description,
      type: newEvent.type,
      location: newEvent.location || '',
      partifulUrl: newEvent.partifulUrl || '',
      createdAt: newEvent.createdAt,
      createdByUid: newEvent.createdByUid || '',
      createdByName: newEvent.createdByName || 'Section F Member',
    };
    await setDoc(docRef, firestoreData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    // Even if remote write fails, local copy is saved
  }

  return newEvent;
}

/**
 * Delete a cohort event from Firestore and local storage
 */
export async function deleteCohortEvent(id: string): Promise<SectionCohortEvent[]> {
  // Update local cache immediately
  const current = getStoredCohortEvents();
  const updated = current.filter(e => e.id !== id);
  setStoredCohortEvents(updated);

  // Delete from Firestore
  const path = `cohort_events/${id}`;
  try {
    const docRef = doc(db, 'cohort_events', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }

  return updated;
}

/**
 * Update an existing cohort event in Firestore and local storage
 */
export async function updateCohortEvent(
  id: string,
  updates: Partial<Omit<SectionCohortEvent, 'id' | 'createdAt'>>
): Promise<SectionCohortEvent | null> {
  const current = getStoredCohortEvents();
  const existingIndex = current.findIndex(e => e.id === id);
  if (existingIndex === -1) {
    console.warn(`Event ${id} not found in local storage`);
  }

  const existing = existingIndex !== -1 ? current[existingIndex] : null;
  const updatedEvent: SectionCohortEvent = {
    id,
    title: updates.title !== undefined ? updates.title.trim() : (existing?.title || ''),
    date: updates.date !== undefined ? updates.date : (existing?.date || ''),
    time: updates.time !== undefined ? updates.time : (existing?.time || '18:00'),
    description: updates.description !== undefined ? updates.description.trim() : (existing?.description || ''),
    type: updates.type || existing?.type || 'social',
    location: updates.location !== undefined ? updates.location.trim() : (existing?.location || ''),
    partifulUrl: updates.partifulUrl !== undefined ? updates.partifulUrl.trim() : (existing?.partifulUrl || ''),
    createdAt: existing?.createdAt || new Date().toISOString(),
    createdByUid: existing?.createdByUid || auth.currentUser?.uid || '',
    createdByName: existing?.createdByName || auth.currentUser?.displayName || 'Section F Member',
  };

  // Optimistically update local storage
  const updatedList = current.map(e => e.id === id ? updatedEvent : e);
  if (existingIndex === -1) {
    updatedList.unshift(updatedEvent);
  }
  setStoredCohortEvents(updatedList);

  // Persist to Firestore
  const path = `cohort_events/${id}`;
  try {
    const docRef = doc(db, 'cohort_events', id);
    const firestoreData: Record<string, any> = {
      id: updatedEvent.id,
      title: updatedEvent.title,
      date: updatedEvent.date,
      time: updatedEvent.time,
      description: updatedEvent.description,
      type: updatedEvent.type,
      location: updatedEvent.location || '',
      partifulUrl: updatedEvent.partifulUrl || '',
      createdAt: updatedEvent.createdAt,
      createdByUid: updatedEvent.createdByUid || '',
      createdByName: updatedEvent.createdByName || 'Section F Member',
    };
    await setDoc(docRef, firestoreData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  return updatedEvent;
}

