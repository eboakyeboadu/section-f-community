import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MapPin, 
  Clock, 
  Cake, 
  Coffee, 
  Users, 
  Share2, 
  Download, 
  MessageCircle, 
  Phone, 
  X, 
  Check, 
  CalendarDays, 
  ListFilter,
  Sparkles,
  BookOpen,
  Trophy,
  PartyPopper,
  ExternalLink,
  Trash2,
  Edit3,
  Link2,
  Loader2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { Profile, CoffeeChatRecord, SectionCohortEvent, CohortEventType } from '../types';
import { 
  getStoredCohortEvents, 
  saveCohortEvent, 
  updateCohortEvent,
  deleteCohortEvent, 
  subscribeCohortEvents,
  getPartifulGroupUrl
} from '../services/cohortEventsStorage';
import { AddToCalendarDropdown } from './AddToCalendarDropdown';
import { playTapSound } from '../utils/soundEffects';
import { requestNotificationPermission } from '../services/pushNotificationService';

function formatTimeTo12h(time24: string): string {
  if (!time24) return '';
  if (time24.includes('AM') || time24.includes('PM')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

interface CohortCalendarViewProps {
  profiles: Profile[];
  coffeeChatRecords: Record<string, CoffeeChatRecord>;
  currentUserUid?: string;
  currentUserName?: string;
  isGuest?: boolean;
  onSelectProfile: (profile: Profile) => void;
  onOpenCoffeeChats?: () => void;
  onOpenCoffeeChatForProfile?: (profile: Profile) => void;
  onGuestActionPrompt?: (action: string) => void;
}

type CalendarFilter = 'all' | 'birthdays' | 'coffee_chats' | 'events';
type CalendarDisplayMode = 'agenda' | 'month';

interface UnifiedCalendarItem {
  id: string;
  category: 'birthday' | 'coffee_chat' | 'event';
  title: string;
  dateStr: string; // YYYY-MM-DD
  timeStr?: string;
  location?: string;
  description?: string;
  eventSubtype?: CohortEventType;
  partifulUrl?: string;
  createdByUid?: string;
  createdByName?: string;
  profile?: Profile;
  coffeeRecord?: CoffeeChatRecord;
  daysUntil: number;
  isToday: boolean;
  isPast: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CohortCalendarView: React.FC<CohortCalendarViewProps> = ({
  profiles,
  coffeeChatRecords,
  currentUserUid,
  currentUserName,
  isGuest = false,
  onSelectProfile,
  onOpenCoffeeChats,
  onOpenCoffeeChatForProfile,
  onGuestActionPrompt,
}) => {
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>('agenda');
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [cohortEvents, setCohortEvents] = useState<SectionCohortEvent[]>(() => getStoredCohortEvents());
  
  // Real-time Firestore sync for Cohort Events
  useEffect(() => {
    const unsubscribe = subscribeCohortEvents((events) => {
      setCohortEvents(events);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Section Partiful Group Link State
  const [partifulGroupUrl] = useState<string>(() => getPartifulGroupUrl());

  // Selected Month for Month Grid View
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Add & Edit Event Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('18:00');
  const [newEventReminder, setNewEventReminder] = useState<number>(15);
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventPartifulUrl, setNewEventPartifulUrl] = useState('');
  const [newEventType, setNewEventType] = useState<CohortEventType>('social');
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [addError, setAddError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    date?: string;
    time?: string;
    description?: string;
  }>({});
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  // 1. Process Classmate Birthdays into Unified Calendar Items
  const birthdayItems = useMemo<UnifiedCalendarItem[]>(() => {
    const items: UnifiedCalendarItem[] = [];
    const currentYear = today.getFullYear();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    profiles.forEach(p => {
      if (!p.birthday && !p.birthdayMonth && !p.birthdayDay) return;

      let monthIndex = -1;
      let dayNum = -1;

      if (p.birthdayMonth && p.birthdayDay) {
        // e.g. "October", "15"
        monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(p.birthdayMonth!.toLowerCase().substring(0, 3)));
        dayNum = parseInt(p.birthdayDay, 10);
      } else if (p.birthday) {
        // Parse "October 15" or "10/15" or "Oct 15"
        const parts = p.birthday.trim().split(/[\s,/-]+/);
        if (parts.length >= 2) {
          const mPart = parts[0].toLowerCase();
          const dPart = parseInt(parts[1], 10);
          if (!isNaN(dPart)) {
            dayNum = dPart;
            monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(mPart.substring(0, 3)));
            if (monthIndex === -1 && !isNaN(parseInt(mPart, 10))) {
              monthIndex = parseInt(mPart, 10) - 1;
            }
          }
        }
      }

      if (monthIndex >= 0 && dayNum >= 1 && dayNum <= 31) {
        // Calculate date in current year
        let bdayDate = new Date(currentYear, monthIndex, dayNum);
        // If birthday has passed this year by more than 1 day, calculate for next year
        if (bdayDate.getTime() < todayZero.getTime()) {
          bdayDate = new Date(currentYear + 1, monthIndex, dayNum);
        }

        const diffTime = bdayDate.getTime() - todayZero.getTime();
        const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const isToday = daysUntil === 0;

        const dateStr = `${bdayDate.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

        items.push({
          id: `bday-${p.uid}`,
          category: 'birthday',
          title: `${p.fullName}'s Birthday 🎂`,
          dateStr,
          profile: p,
          daysUntil,
          isToday,
          isPast: daysUntil < 0,
        });
      }
    });

    return items;
  }, [profiles, today]);

  // 2. Process Coffee Chat records into Unified Calendar Items
  const coffeeChatItems = useMemo<UnifiedCalendarItem[]>(() => {
    const items: UnifiedCalendarItem[] = [];
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    Object.entries(coffeeChatRecords).forEach(([classmateUid, record]) => {
      if (record.status === 'scheduled') {
        const classmate = profiles.find(p => p.uid === classmateUid);
        if (!classmate) return;

        // Try using record.scheduledDate, or fallback to updatedAt/requestedAt
        const refDate = record.updatedAt ? new Date(record.updatedAt) : new Date();
        const dateStr = record.scheduledDate || `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(refDate.getDate()).padStart(2, '0')}`;
        
        let daysUntil = 0;
        if (record.scheduledDate) {
          const [sy, sm, sd] = record.scheduledDate.split('-').map(Number);
          const schedDateZero = new Date(sy, (sm || 1) - 1, sd || 1);
          daysUntil = Math.round((schedDateZero.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          const eventDateZero = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
          const diffTime = eventDateZero.getTime() - todayZero.getTime();
          daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));
        }

        items.push({
          id: `coffee-${classmateUid}`,
          category: 'coffee_chat',
          title: `Coffee Chat with ${classmate.fullName}`,
          dateStr,
          timeStr: record.scheduledTime || '2:00 PM',
          location: record.locationOrTopic || 'Spangler Grille or Chao Center',
          description: record.notes || '',
          profile: classmate,
          coffeeRecord: record,
          daysUntil: Math.max(0, daysUntil),
          isToday: daysUntil === 0,
          isPast: daysUntil < 0,
        });
      }
    });

    return items;
  }, [coffeeChatRecords, profiles, today]);

  // 3. Process Section Cohort Events
  const sectionEventItems = useMemo<UnifiedCalendarItem[]>(() => {
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return cohortEvents.map(evt => {
      // date is YYYY-MM-DD
      const [y, m, d] = evt.date.split('-').map(Number);
      const eventDate = new Date(y, (m || 1) - 1, d || 1);
      const diffTime = eventDate.getTime() - todayZero.getTime();
      const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: evt.id,
        category: 'event',
        title: evt.title,
        dateStr: evt.date,
        timeStr: evt.time,
        location: evt.location,
        description: evt.description,
        eventSubtype: evt.type,
        partifulUrl: evt.partifulUrl,
        createdByUid: evt.createdByUid,
        createdByName: evt.createdByName,
        daysUntil,
        isToday: daysUntil === 0,
        isPast: daysUntil < 0,
      };
    });
  }, [cohortEvents, today]);

  // Combined & Sorted Unified Items
  const allItems = useMemo(() => {
    let combined: UnifiedCalendarItem[] = [];

    if (filter === 'all') {
      combined = [...birthdayItems, ...coffeeChatItems, ...sectionEventItems];
    } else if (filter === 'birthdays') {
      combined = [...birthdayItems];
    } else if (filter === 'coffee_chats') {
      combined = [...coffeeChatItems];
    } else if (filter === 'events') {
      combined = [...sectionEventItems];
    }

    // Sort: Today and upcoming events first (soonest first), followed by past events
    const upcoming = combined
      .filter(item => item.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    const past = combined
      .filter(item => item.daysUntil < 0)
      .sort((a, b) => b.daysUntil - a.daysUntil);

    return [...upcoming, ...past];
  }, [filter, birthdayItems, coffeeChatItems, sectionEventItems]);

  // Items mapped by YYYY-MM-DD for the Month Grid View
  const itemsByDateMap = useMemo(() => {
    const map = new Map<string, UnifiedCalendarItem[]>();
    [...birthdayItems, ...coffeeChatItems, ...sectionEventItems].forEach(item => {
      const list = map.get(item.dateStr) || [];
      list.push(item);
      map.set(item.dateStr, list);
    });
    return map;
  }, [birthdayItems, coffeeChatItems, sectionEventItems]);

  // Calendar calculations for month view
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Quick Action Handlers
  const handleWishBirthday = (profile: Profile) => {
    if (isGuest && onGuestActionPrompt) {
      onGuestActionPrompt('wish happy birthday');
      return;
    }

    const cleanName = profile.fullName.split(' ')[0];
    const textMsg = `Happy Birthday ${cleanName}! 🎂 Wishing you an amazing year ahead from Section F! 🎉`;

    if (!profile.notOnWhatsApp && profile.whatsapp) {
      const cleanPhone = profile.whatsapp.replace(/[^\d+]/g, '');
      const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(textMsg)}`;
      window.open(waUrl, '_blank');
    } else if (profile.phone) {
      const cleanPhone = profile.phone.replace(/[^\d+]/g, '');
      window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(textMsg)}`;
    } else {
      onSelectProfile(profile);
    }
  };

  const handleDeleteEvent = (id: string) => {
    setEventToDeleteId(id);
  };

  const handleConfirmDeleteEvent = async () => {
    if (!eventToDeleteId) return;
    setIsDeletingEvent(true);
    try {
      await deleteCohortEvent(eventToDeleteId);
      setEventToDeleteId(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventTime('18:00');
    setNewEventReminder(15);
    setNewEventLocation('');
    setNewEventDesc('');
    setNewEventPartifulUrl('');
    setNewEventType('social');
    setAddError('');
    setFieldErrors({});
    setShowAddModal(true);
  };

  const handleOpenEditEvent = (evt: SectionCohortEvent) => {
    setEditingEventId(evt.id);
    setNewEventTitle(evt.title || '');
    setNewEventDate(evt.date || '');

    // Parse time to HH:MM format for native time input
    let parsedTime = evt.time || '18:00';
    if (parsedTime.includes('AM') || parsedTime.includes('PM')) {
      const match = parsedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2];
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        parsedTime = `${String(h).padStart(2, '0')}:${m}`;
      }
    }
    setNewEventTime(parsedTime);
    setNewEventReminder(15);
    setNewEventLocation(evt.location || '');
    setNewEventDesc(evt.description || '');
    setNewEventPartifulUrl(evt.partifulUrl || '');
    setNewEventType(evt.type || 'social');
    setAddError('');
    setFieldErrors({});
    setShowAddModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { title?: string; date?: string; time?: string; description?: string } = {};
    if (!newEventTitle.trim()) {
      errors.title = 'Please enter an event title';
    }
    if (!newEventDate) {
      errors.date = 'Please select an event date';
    }
    if (!newEventTime.trim()) {
      errors.time = 'Time is required';
    }
    if (!newEventDesc.trim()) {
      errors.description = 'Please enter an event description';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAddError('Please fill in all required fields.');
      return;
    }

    setFieldErrors({});
    setIsSavingEvent(true);
    setAddError('');

    try {
      const formattedTime = formatTimeTo12h(newEventTime.trim());

      if (editingEventId) {
        // Edit existing cohort event
        const updated = await updateCohortEvent(editingEventId, {
          title: newEventTitle.trim(),
          date: newEventDate,
          time: formattedTime,
          location: newEventLocation.trim(),
          description: newEventDesc.trim(),
          type: newEventType,
          partifulUrl: newEventPartifulUrl.trim(),
        });

        if (updated) {
          setCohortEvents((prev) => {
            const filtered = prev.filter(item => item.id !== editingEventId);
            return [updated, ...filtered].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
          });
        }
      } else {
        // Create new cohort event
        const saved = await saveCohortEvent({
          title: newEventTitle.trim(),
          date: newEventDate,
          time: formattedTime,
          location: newEventLocation.trim(),
          description: newEventDesc.trim(),
          type: newEventType,
          partifulUrl: newEventPartifulUrl.trim(),
          createdByUid: currentUserUid,
          createdByName: currentUserName || 'Section F Member',
        });

        // Optimistically update calendar state immediately so the event displays with 0ms latency
        setCohortEvents((prev) => {
          const filtered = prev.filter(item => item.id !== saved.id);
          return [saved, ...filtered].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        });

        // Request phone notification permission if user chose a reminder alert
        if (newEventReminder >= 0 && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          requestNotificationPermission(currentUserUid).catch(() => {});
        }
      }

      setShowAddModal(false);
      setEditingEventId(null);
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventTime('18:00');
      setNewEventReminder(15);
      setNewEventLocation('');
      setNewEventDesc('');
      setNewEventPartifulUrl('');
      setNewEventType('social');
      setAddError('');
      setFieldErrors({});
    } catch (err) {
      console.error('Failed to save event:', err);
      setAddError('Could not sync with the section right now. Your event is saved locally on this device.');
    } finally {
      setIsSavingEvent(false);
    }
  };

  // Helper for human-readable days countdown
  const formatDaysUntil = (days: number) => {
    if (days === 0) return 'Today 🎉';
    if (days === 1) return 'Tomorrow';
    if (days > 1 && days < 7) return `In ${days} days`;
    if (days >= 7 && days < 14) return 'Next week';
    if (days < 0) return 'Passed';
    return `In ${days} days`;
  };

  // Render Category Badge
  const renderBadge = (item: UnifiedCalendarItem) => {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {item.category === 'birthday' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Cake className="w-3 h-3 text-rose-400" />
            Birthday
          </span>
        )}
        {item.category === 'coffee_chat' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Coffee className="w-3 h-3 text-amber-400" />
            Coffee Chat
          </span>
        )}
        {item.category === 'event' && item.eventSubtype === 'academic' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <BookOpen className="w-3 h-3 text-blue-400" />
            Academic
          </span>
        )}
        {item.category === 'event' && item.eventSubtype === 'sports' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Trophy className="w-3 h-3 text-emerald-400" />
            Sports & Fitness
          </span>
        )}
        {item.category === 'event' && (item.eventSubtype === 'social' || !item.eventSubtype || item.eventSubtype === 'other') && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <PartyPopper className="w-3 h-3 text-purple-400" />
            Section Social
          </span>
        )}
        {item.partifulUrl && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
            <span>🎈</span>
            <span>Partiful</span>
          </span>
        )}
      </div>
    );
  };

  // Master RFC 5545 iCalendar (.ics) export engine
  const handleExportMasterICS = () => {
    playTapSound();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatICSDate = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const formatICSAllDay = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Section F Community Hub//Class of 2028//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Section F 2028',
      'X-WR-TIMEZONE:America/New_York',
    ];

    // Export all section gatherings & cohort events
    cohortEvents.forEach((ev) => {
      const dtStamp = formatICSDate(new Date());
      const rawDate = (ev.date || '').replace(/[^0-9]/g, '');
      const rawTime = (ev.time || '18:00').replace(/[^0-9]/g, '').padEnd(4, '0');
      const dtStart = rawDate ? `${rawDate}T${rawTime}00` : formatICSDate(new Date());

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:event-${ev.id}@sectionf.community`);
      lines.push(`DTSTAMP:${dtStamp}`);
      lines.push(`DTSTART;TZID=America/New_York:${dtStart}`);
      lines.push(`SUMMARY:${(ev.title || 'Section F Event').replace(/[,;]/g, ' ')}`);
      if (ev.location) lines.push(`LOCATION:${ev.location.replace(/[,;]/g, ' ')}`);
      if (ev.description || ev.partifulUrl) {
        const desc = [ev.description, ev.partifulUrl ? `Partiful: ${ev.partifulUrl}` : ''].filter(Boolean).join('\\n');
        lines.push(`DESCRIPTION:${desc.replace(/\n/g, '\\n')}`);
      }
      lines.push('END:VEVENT');
    });

    // Export annual recurring birthdays for all section classmates
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    profiles.forEach((p) => {
      if (p.birthdayMonth && p.birthdayDay) {
        const mIdx = Object.keys(monthMap).find((k) => p.birthdayMonth!.toLowerCase().startsWith(k));
        if (mIdx !== undefined) {
          const monthNum = monthMap[mIdx];
          const dayNum = parseInt(p.birthdayDay, 10);
          if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
            const bdayDate = new Date(2026, monthNum, dayNum);
            const dtStart = formatICSAllDay(bdayDate);
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:bday-${p.uid}@sectionf.community`);
            lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
            lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
            lines.push(`SUMMARY:🎂 ${p.fullName}'s Birthday (Section F)`);
            lines.push('RRULE:FREQ=YEARLY');
            lines.push('END:VEVENT');
          }
        }
      }
    });

    lines.push('END:VCALENDAR');
    const icsContent = lines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Section_F_Cohort_Calendar.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-4 pb-32 pt-2 sm:pt-4">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Section Calendar
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  Section F
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Classmate birthdays, coffee chats & section gatherings
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Add Event Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Dual View Toggle */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex items-center flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setDisplayMode('agenda')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                displayMode === 'agenda'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('month')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                displayMode === 'month'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
          </div>

          {/* Add Cohort Event Button */}
          {!isGuest && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Lean Section F Partiful Banner */}
      <div className="mb-4 px-3.5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-950/50 via-purple-950/40 to-slate-900/60 border border-fuchsia-500/25 flex items-center justify-between gap-3 shadow-md shadow-purple-950/15">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-fuchsia-600 to-pink-500 flex items-center justify-center text-sm sm:text-base shadow-sm shadow-fuchsia-500/30 shrink-0">
            🎈
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight shrink-0">Section F Partiful</span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="text-[11px] sm:text-xs text-fuchsia-200/80 truncate hidden sm:inline">
              Check out upcoming events on Partiful
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={partifulGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-fuchsia-500/25 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <span>Open Partiful</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
            filter === 'all'
              ? 'bg-white/15 text-white border-white/30 shadow-sm'
              : 'bg-white/[0.03] text-slate-400 border-white/5 hover:border-white/15 hover:text-slate-200'
          }`}
        >
          All Items ({birthdayItems.length + coffeeChatItems.length + sectionEventItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('birthdays')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
            filter === 'birthdays'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
              : 'bg-white/[0.03] text-slate-400 border-white/5 hover:border-rose-500/20 hover:text-rose-300'
          }`}
        >
          <Cake className="w-3.5 h-3.5 text-rose-400" />
          Birthdays ({birthdayItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('coffee_chats')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
            filter === 'coffee_chats'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-white/[0.03] text-slate-400 border-white/5 hover:border-amber-500/20 hover:text-amber-300'
          }`}
        >
          <Coffee className="w-3.5 h-3.5 text-amber-400" />
          Coffee Chats ({coffeeChatItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('events')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
            filter === 'events'
              ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 shadow-sm'
              : 'bg-white/[0.03] text-slate-400 border-white/5 hover:border-fuchsia-500/20 hover:text-fuchsia-300'
          }`}
        >
          <PartyPopper className="w-3.5 h-3.5 text-fuchsia-400" />
          Section Events ({sectionEventItems.length})
        </button>
      </div>

      {/* Main Content Area */}
      {displayMode === 'agenda' ? (
        /* ================= AGENDA TIMELINE VIEW ================= */
        <div className="space-y-4">
          {allItems.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white/[0.02] border border-white/10 rounded-2xl">
              <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">No items match this filter</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Check back soon or add an upcoming Section F event for the section.
              </p>
            </div>
          ) : (
            allItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-2xl border transition-all ${
                  item.isToday
                    ? 'bg-gradient-to-r from-amber-500/15 via-purple-900/20 to-[#150D2A] border-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30'
                    : 'bg-[#150D2A]/80 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col gap-3.5">
                  {/* Top: Classmate Avatar/Icon & Event Info */}
                  <div className="flex items-start gap-3.5 w-full">
                    {/* Classmate Avatar or Event Icon */}
                    {item.profile ? (
                      <div 
                        onClick={() => onSelectProfile(item.profile!)}
                        className="relative cursor-pointer shrink-0 group mt-0.5"
                      >
                        {item.profile.photoUrl && item.profile.photoUrl.trim() !== '' ? (
                          <img
                            src={item.profile.photoUrl}
                            alt={item.profile.fullName}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-amber-400 transition-all shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#2E244A] border border-[#F59E0B]/40 flex items-center justify-center font-bold text-amber-300 text-base sm:text-lg shadow-md ring-2 ring-white/10">
                            {item.profile.fullName ? item.profile.fullName.charAt(0) : 'F'}
                          </div>
                        )}
                        {item.category === 'birthday' && (
                          <span className="absolute -bottom-1 -right-1 p-1 bg-rose-500 text-white rounded-full shadow-md">
                            <Cake className="w-3 h-3" />
                          </span>
                        )}
                        {item.category === 'coffee_chat' && (
                          <span className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-slate-950 rounded-full shadow-md">
                            <Coffee className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-300 mt-0.5">
                        {item.eventSubtype === 'academic' && <BookOpen className="w-6 h-6 text-blue-400" />}
                        {item.eventSubtype === 'sports' && <Trophy className="w-6 h-6 text-emerald-400" />}
                        {item.eventSubtype !== 'academic' && item.eventSubtype !== 'sports' && <PartyPopper className="w-6 h-6 text-amber-400" />}
                      </div>
                    )}

                    {/* Details Container */}
                    <div className="min-w-0 flex-1">
                      {/* Badge & Days Until */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                        {renderBadge(item)}
                        <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          item.isToday 
                            ? 'bg-amber-400 text-slate-950 shadow-sm animate-pulse'
                            : 'bg-white/5 text-slate-300 border border-white/5'
                        }`}>
                          {formatDaysUntil(item.daysUntil)}
                        </span>
                      </div>

                      {/* Title - Clean break-words so never clipped */}
                      <h3 
                        onClick={() => item.profile && onSelectProfile(item.profile)}
                        className={`text-sm sm:text-base font-bold text-white tracking-tight break-words leading-snug ${
                          item.profile ? 'cursor-pointer hover:text-amber-300 transition-colors' : ''
                        }`}
                      >
                        {item.title}
                      </h3>

                      {/* Classmate Home Country & Company - strictly single line without wrapping */}
                      {item.profile && item.category !== 'coffee_chat' && (
                        <p className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                          <span className="truncate">{item.profile.homeCountry || 'Section F'}</span>
                          {item.profile.preHbsCompany && (
                            <>
                              <span className="text-slate-600 shrink-0">•</span>
                              <span className="truncate">Ex-{item.profile.preHbsCompany}</span>
                            </>
                          )}
                        </p>
                      )}

                      {/* Event Meta: Location & Time Chips */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] sm:text-xs text-slate-300">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                          <CalendarIcon className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                          <span className="font-medium">{item.dateStr}</span>
                        </div>
                        {item.timeStr && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                            <Clock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                            <span className="font-medium">{item.timeStr}</span>
                          </div>
                        )}
                        {item.location && item.category !== 'coffee_chat' && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 max-w-full">
                            <MapPin className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                            <span className="font-medium break-words leading-tight">{item.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Description (hidden for coffee chats to keep clean) */}
                      {item.description && item.category !== 'coffee_chat' && (
                        <p className="text-xs text-slate-300/80 mt-2 leading-relaxed break-words bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 w-full pt-3 border-t border-white/10">
                    {/* Birthday Quick Wish Actions */}
                    {item.category === 'birthday' && item.profile && (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <button
                          type="button"
                          onClick={() => handleWishBirthday(item.profile!)}
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                        >
                          <Cake className="w-3.5 h-3.5" />
                          <span>Wish Birthday</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProfile(item.profile!)}
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
                        >
                          View Card
                        </button>
                      </div>
                    )}

                    {/* Coffee Chat Actions */}
                    {item.category === 'coffee_chat' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        {item.profile && (onOpenCoffeeChatForProfile || onOpenCoffeeChats) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenCoffeeChatForProfile && item.profile) {
                                onOpenCoffeeChatForProfile(item.profile);
                              } else if (onOpenCoffeeChats) {
                                onOpenCoffeeChats();
                              }
                            }}
                            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer text-center"
                          >
                            Chat Details
                          </button>
                        )}
                        <AddToCalendarDropdown
                          event={{
                            title: item.title,
                            description: item.description,
                            location: item.location,
                            date: item.dateStr,
                            time: item.timeStr || '12:00 PM',
                          }}
                          variant="compact"
                          align="right"
                        />
                      </div>
                    )}

                    {/* Section Event Actions */}
                    {item.category === 'event' && (
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full justify-between sm:justify-end">
                        {item.createdByName && (
                          <span className="text-[11px] text-slate-400 sm:mr-auto">
                            By {item.createdByName}
                          </span>
                        )}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {item.partifulUrl && (
                            <a
                              href={item.partifulUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-fuchsia-500/25 transition-all active:scale-95 cursor-pointer"
                            >
                              <span>🎈</span>
                              <span>RSVP on Partiful</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <AddToCalendarDropdown
                            event={{
                              title: item.title,
                              description: item.description,
                              location: item.location,
                              date: item.dateStr,
                              time: item.timeStr || '12:00 PM',
                            }}
                            label="Add to Calendar"
                            variant="button"
                            align="right"
                          />
                          {(!isGuest && (item.createdByUid === currentUserUid || !item.createdByUid)) && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const fullEvt = cohortEvents.find(e => e.id === item.id);
                                  if (fullEvt) {
                                    handleOpenEditEvent(fullEvt);
                                  }
                                }}
                                title="Edit event"
                                className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(item.id)}
                                title="Delete event"
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* ================= MONTH GRID VIEW ================= */
        <div className="bg-[#150D2A]/90 border border-white/10 rounded-2xl p-3 sm:p-6 shadow-xl">
          {/* Month Navigation Controls */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewYear(today.getFullYear());
                  setViewMonth(today.getMonth());
                }}
                className="px-2.5 sm:px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] sm:text-xs font-semibold text-slate-300 border border-white/10 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] sm:text-xs font-bold text-slate-400 mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Empty slots for first week offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[48px] sm:min-h-[85px] rounded-xl bg-white/[0.01]" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayItems = itemsByDateMap.get(dateStr) || [];
              const isTodayCell = 
                viewYear === today.getFullYear() && 
                viewMonth === today.getMonth() && 
                day === today.getDate();
              const isSelected = selectedDayDate === dateStr;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDayDate(dateStr === selectedDayDate ? null : dateStr)}
                  className={`min-h-[48px] sm:min-h-[85px] p-1 sm:p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                    isTodayCell
                      ? 'bg-amber-500/10 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : isSelected
                      ? 'bg-white/10 border-amber-400 ring-1 ring-amber-400/50'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] sm:text-xs font-bold ${isTodayCell ? 'text-amber-400' : 'text-slate-300'}`}>
                      {day}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-extrabold px-1 rounded-full bg-white/10 text-white">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Mobile Indicator Dots (< sm) */}
                  <div className="flex sm:hidden items-center justify-center gap-1 mt-1 flex-wrap">
                    {dayItems.slice(0, 3).map(item => (
                      <span
                        key={item.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.category === 'birthday'
                            ? 'bg-rose-400'
                            : item.category === 'coffee_chat'
                            ? 'bg-amber-400'
                            : 'bg-purple-400'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Desktop / Tablet Indicator Pills (>= sm) */}
                  <div className="hidden sm:flex flex-col gap-1 mt-1">
                    {dayItems.slice(0, 2).map(item => (
                      <div
                        key={item.id}
                        className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${
                          item.category === 'birthday'
                            ? 'bg-rose-500/20 text-rose-300'
                            : item.category === 'coffee_chat'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-medium pl-1">
                        +{dayItems.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Detail Drawer in Month View */}
          {selectedDayDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-400" />
                  Events for {selectedDayDate}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedDayDate(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(itemsByDateMap.get(selectedDayDate) || []).length === 0 ? (
                <p className="text-xs text-slate-400">No events scheduled for this day.</p>
              ) : (
                <div className="space-y-2">
                  {(itemsByDateMap.get(selectedDayDate) || []).map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#120B24] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {renderBadge(item)}
                          {item.timeStr && (
                            <span className="text-[10px] text-slate-400 font-medium">{item.timeStr}</span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-white break-words leading-snug">{item.title}</div>
                        {item.profile && item.category !== 'coffee_chat' && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                            <span className="truncate">{item.profile.homeCountry || 'Section F'}</span>
                            {item.profile.preHbsCompany && (
                              <>
                                <span className="text-slate-600 shrink-0">•</span>
                                <span className="truncate">Ex-{item.profile.preHbsCompany}</span>
                              </>
                            )}
                          </div>
                        )}
                        {item.location && (
                          <div className="text-[11px] text-slate-400 mt-1 break-words flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{item.location}</span>
                          </div>
                        )}
                        {item.createdByName && (
                          <div className="text-[10px] text-slate-400 mt-1 truncate">
                            Posted by {item.createdByName}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        {item.partifulUrl && (
                          <a
                            href={item.partifulUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>🎈</span>
                            <span>Partiful</span>
                          </a>
                        )}
                        {item.category === 'coffee_chat' && item.profile && (onOpenCoffeeChatForProfile || onOpenCoffeeChats) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenCoffeeChatForProfile && item.profile) {
                                onOpenCoffeeChatForProfile(item.profile);
                              } else if (onOpenCoffeeChats) {
                                onOpenCoffeeChats();
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer"
                          >
                            Chat Details
                          </button>
                        )}
                        {item.profile && (
                          <button
                            type="button"
                            onClick={() => onSelectProfile(item.profile!)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-amber-400 border border-white/10 transition-colors cursor-pointer"
                          >
                            View Card
                          </button>
                        )}
                        {(item.category === 'event' || item.category === 'coffee_chat') && (
                          <AddToCalendarDropdown
                            event={{
                              title: item.title,
                              description: item.description,
                              location: item.location,
                              date: item.dateStr,
                              time: item.timeStr || '12:00 PM',
                            }}
                            variant="compact"
                            align="right"
                          />
                        )}
                        {(!isGuest && (item.createdByUid === currentUserUid || !item.createdByUid)) && (
                          <>
                            {item.category === 'event' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const fullEvt = cohortEvents.find(e => e.id === item.id);
                                  if (fullEvt) {
                                    handleOpenEditEvent(fullEvt);
                                  }
                                }}
                                title="Edit event"
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(item.id)}
                              title="Delete event"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* ================= ADD / EDIT COHORT EVENT MODAL ================= */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-[#140D26] border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-[90dvh] max-h-[640px] overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Modal Header */}
              <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-[#160E2D] border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    {editingEventId ? <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" /> : <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
                      {editingEventId ? 'Edit Section Event' : 'Add Section Event'}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                      {editingEventId ? 'Update details, date, time, or Partiful link' : 'Post an upcoming social, study session, or Partiful gathering'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body - Static geometry with zero layout jumping */}
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 overscroll-contain text-left">
                <form id="cohort-event-form" onSubmit={handleSaveEvent} className="space-y-3.5">
                  {/* Event Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">
                        Event Title <span className="text-amber-400">*</span>
                      </label>
                      {fieldErrors.title && (
                        <span className="text-[11px] text-rose-400 font-medium">{fieldErrors.title}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newEventTitle}
                      onChange={e => {
                        setNewEventTitle(e.target.value);
                        if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: undefined }));
                      }}
                      placeholder="e.g. Friday Section Drinks, Case Study Prep"
                      className={`w-full h-11 px-3.5 rounded-xl bg-[#18102C] border text-white text-sm placeholder-slate-500 focus:outline-none transition-colors ${
                        fieldErrors.title
                          ? 'border-rose-500 ring-1 ring-rose-500/50'
                          : 'border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
                      }`}
                      required
                    />
                  </div>

                  {/* Category Chips - Static 4-column grid */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Category
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewEventType('social')}
                        className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          newEventType === 'social'
                            ? 'bg-fuchsia-500/25 text-fuchsia-200 border-fuchsia-500 shadow-sm'
                            : 'bg-[#18102C] text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-sm">🎈</span>
                        <span className="truncate">Social</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewEventType('academic')}
                        className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          newEventType === 'academic'
                            ? 'bg-blue-500/25 text-blue-200 border-blue-500 shadow-sm'
                            : 'bg-[#18102C] text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-sm">📚</span>
                        <span className="truncate">Academic</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewEventType('sports')}
                        className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          newEventType === 'sports'
                            ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500 shadow-sm'
                            : 'bg-[#18102C] text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-sm">🏃</span>
                        <span className="truncate">Sports</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewEventType('other')}
                        className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          newEventType === 'other'
                            ? 'bg-purple-500/25 text-purple-200 border-purple-500 shadow-sm'
                            : 'bg-[#18102C] text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-sm">🎉</span>
                        <span className="truncate">Other</span>
                      </button>
                    </div>
                  </div>

                  {/* Partiful Link Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <span>🎈 Partiful Link</span>
                        <span className="text-[10px] text-fuchsia-300 font-normal bg-fuchsia-500/10 px-1.5 py-0.5 rounded border border-fuchsia-500/20">Optional</span>
                      </label>
                      <span className="text-[10px] text-slate-400">partiful.com/e/...</span>
                    </div>
                    <div className="relative">
                      <input
                        type="url"
                        value={newEventPartifulUrl}
                        onChange={e => setNewEventPartifulUrl(e.target.value)}
                        placeholder="https://partiful.com/e/your-event-code"
                        className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-[#18102C] border border-white/10 focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400/40 focus:outline-none text-white text-sm placeholder-slate-500"
                      />
                      <Link2 className="w-4 h-4 text-fuchsia-400 absolute left-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Date & Time Grid - Symmetrical 2 Columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">
                          Date <span className="text-amber-400">*</span>
                        </label>
                        {fieldErrors.date && (
                          <span className="text-[10px] text-rose-400 font-medium">Required</span>
                        )}
                      </div>
                      <input
                        type="date"
                        value={newEventDate}
                        onChange={e => {
                          setNewEventDate(e.target.value);
                          if (fieldErrors.date) setFieldErrors(prev => ({ ...prev, date: undefined }));
                        }}
                        style={{ colorScheme: 'dark' }}
                        className={`w-full h-11 px-3.5 rounded-xl bg-[#18102C] border text-white text-sm focus:outline-none transition-colors ${
                          fieldErrors.date
                            ? 'border-rose-500 ring-1 ring-rose-500/50'
                            : 'border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">
                          Time <span className="text-amber-400">*</span>
                        </label>
                        {fieldErrors.time && (
                          <span className="text-[10px] text-rose-400 font-medium">Required</span>
                        )}
                      </div>
                      <input
                        type="time"
                        value={newEventTime}
                        onChange={e => {
                          setNewEventTime(e.target.value);
                          if (fieldErrors.time) setFieldErrors(prev => ({ ...prev, time: undefined }));
                        }}
                        style={{ colorScheme: 'dark' }}
                        className={`w-full h-11 px-3.5 rounded-xl bg-[#18102C] border text-white text-sm focus:outline-none transition-colors ${
                          fieldErrors.time
                            ? 'border-rose-500 ring-1 ring-rose-500/50'
                            : 'border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Fast Time Presets - Static Clean Row */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold mr-1 shrink-0">Preset:</span>
                    {[
                      { label: '12:00 PM', val: '12:00' },
                      { label: '4:00 PM', val: '16:00' },
                      { label: '6:00 PM', val: '18:00' },
                      { label: '7:30 PM', val: '19:30' },
                      { label: '8:00 PM', val: '20:00' },
                    ].map(t => (
                      <button
                        key={t.val}
                        type="button"
                        onClick={() => {
                          setNewEventTime(t.val);
                          if (fieldErrors.time) setFieldErrors(prev => ({ ...prev, time: undefined }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer shrink-0 ${
                          newEventTime === t.val
                            ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Location & Reminder Selector Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Location <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={newEventLocation}
                        onChange={e => setNewEventLocation(e.target.value)}
                        placeholder="e.g. Spangler Grille, Hawes 202"
                        className="w-full h-11 px-3.5 rounded-xl bg-[#18102C] border border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 focus:outline-none text-white text-sm placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Reminder
                      </label>
                      <select
                        value={newEventReminder}
                        onChange={(e) => setNewEventReminder(Number(e.target.value))}
                        style={{ colorScheme: 'dark' }}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#18102C] border border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 focus:outline-none text-white text-sm cursor-pointer"
                      >
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before</option>
                        <option value={60}>1 hour before</option>
                        <option value={1440}>1 day before</option>
                        <option value={0}>At event time</option>
                        <option value={-1}>No reminder</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">
                        Description <span className="text-amber-400">*</span>
                      </label>
                      {fieldErrors.description && (
                        <span className="text-[11px] text-rose-400 font-medium">{fieldErrors.description}</span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      required
                      value={newEventDesc}
                      onChange={e => {
                        setNewEventDesc(e.target.value);
                        if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: undefined }));
                      }}
                      placeholder="Enter description, dress code, or bring-your-own details..."
                      className={`w-full h-20 p-3 rounded-xl bg-[#18102C] border text-white text-sm placeholder-slate-500 resize-none focus:outline-none transition-colors ${
                        fieldErrors.description
                          ? 'border-rose-500 ring-1 ring-rose-500/50'
                          : 'border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
                      }`}
                    />
                  </div>
                </form>
              </div>

              {/* Sticky Modal Footer */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-[#120A24] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
                <div className="text-xs text-rose-400 font-medium truncate w-full sm:w-auto text-left">
                  {addError || ''}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer h-11 flex items-center justify-center transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="cohort-event-form"
                    disabled={isSavingEvent}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 h-11 transition-all whitespace-nowrap"
                  >
                    {isSavingEvent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isSavingEvent 
                        ? (editingEventId ? 'Saving...' : 'Publishing...') 
                        : (editingEventId ? 'Save Changes' : 'Publish to Section')}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= DELETE EVENT CONFIRMATION MODAL ================= */}
      <AnimatePresence>
        {eventToDeleteId && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setEventToDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-[#171226] border border-rose-500/30 rounded-2xl p-5 shadow-2xl relative text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Delete Section Event?
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Are you sure you want to delete this event from the section calendar? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEventToDeleteId(null)}
                  disabled={isDeletingEvent}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingEvent}
                  onClick={handleConfirmDeleteEvent}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-md shadow-rose-950 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  {isDeletingEvent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isDeletingEvent ? 'Deleting...' : 'Yes, Delete Event'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

