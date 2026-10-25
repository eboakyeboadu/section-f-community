import { CoffeeChatRecord, CoffeeChatStatus } from '../types';

const STORAGE_KEY = 'section_f_coffee_chats';

// Get all stored coffee chat records from localStorage
export function getStoredCoffeeChats(): Record<string, CoffeeChatRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse coffee chat records from storage:', e);
    return {};
  }
}

// Save all coffee chat records to localStorage
export function saveStoredCoffeeChats(records: Record<string, CoffeeChatRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save coffee chat records to storage:', e);
  }
}

// Get record for a single classmate
export function getCoffeeChatForClassmate(
  classmateUid: string,
  records?: Record<string, CoffeeChatRecord>
): CoffeeChatRecord | null {
  const all = records || getStoredCoffeeChats();
  return all[classmateUid] || null;
}

// Set status for a classmate
export function updateCoffeeChatStatus(
  classmateUid: string,
  status: CoffeeChatStatus,
  existingRecords?: Record<string, CoffeeChatRecord>
): Record<string, CoffeeChatRecord> {
  const records = { ...(existingRecords || getStoredCoffeeChats()) };
  const current = records[classmateUid];
  const now = new Date().toISOString();

  if (status === 'none') {
    delete records[classmateUid];
  } else {
    records[classmateUid] = {
      classmateUid,
      status,
      requestedAt: current?.requestedAt || (status === 'request_sent' ? now : undefined),
      completedAt: status === 'completed' ? (current?.completedAt || now) : current?.completedAt,
      notes: current?.notes || '',
      takeaways: current?.takeaways || [],
      locationOrTopic: current?.locationOrTopic || '',
      updatedAt: now,
    };
  }

  saveStoredCoffeeChats(records);
  return records;
}

// Save notes and details for a classmate
export function updateCoffeeChatNotes(
  classmateUid: string,
  updates: {
    status?: CoffeeChatStatus;
    notes?: string;
    takeaways?: string[];
    locationOrTopic?: string;
    completedAt?: string;
    scheduledDate?: string;
    scheduledTime?: string;
  },
  existingRecords?: Record<string, CoffeeChatRecord>
): Record<string, CoffeeChatRecord> {
  const records = { ...(existingRecords || getStoredCoffeeChats()) };
  const current = records[classmateUid];
  const now = new Date().toISOString();

  const newStatus = updates.status || current?.status || 'completed';

  records[classmateUid] = {
    classmateUid,
    status: newStatus,
    requestedAt: current?.requestedAt || now,
    completedAt: updates.completedAt !== undefined 
      ? updates.completedAt 
      : (newStatus === 'completed' ? (current?.completedAt || now) : current?.completedAt),
    scheduledDate: updates.scheduledDate !== undefined ? updates.scheduledDate : current?.scheduledDate,
    scheduledTime: updates.scheduledTime !== undefined ? updates.scheduledTime : current?.scheduledTime,
    notes: updates.notes !== undefined ? updates.notes : (current?.notes || ''),
    takeaways: updates.takeaways !== undefined ? updates.takeaways : (current?.takeaways || []),
    locationOrTopic: updates.locationOrTopic !== undefined ? updates.locationOrTopic : (current?.locationOrTopic || ''),
    updatedAt: now,
  };

  saveStoredCoffeeChats(records);
  return records;
}

