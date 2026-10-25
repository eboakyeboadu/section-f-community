// Utility to generate Google Calendar links, Outlook links, and .ics calendar files

export interface CalendarEventParams {
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "19:00" or "7:00 PM"
  durationMinutes?: number;
  alarmMinutesBefore?: number;
}

export function parseCalendarDateTime(dateStr: string, timeStr?: string, durationMinutes = 60): { start: Date; end: Date } {
  // dateStr is YYYY-MM-DD
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || (new Date().getMonth() + 1);
  const day = parts[2] || new Date().getDate();

  let hours = 12;
  let minutes = 0;

  if (timeStr) {
    const isPM = /pm/i.test(timeStr);
    const isAM = /am/i.test(timeStr);
    const match = timeStr.match(/(\d+):?(\d*)/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      hours = h;
      minutes = m;
    }
  }

  const start = new Date(year, month - 1, day, hours, minutes, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
}

function formatIsoForGCal(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
}

export function getGoogleCalendarUrl(params: CalendarEventParams): string {
  const { start, end } = parseCalendarDateTime(params.date, params.time, params.durationMinutes || 60);
  const startIso = formatIsoForGCal(start);
  const endIso = formatIsoForGCal(end);

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', params.title);
  if (params.description) url.searchParams.set('details', params.description);
  if (params.location) url.searchParams.set('location', params.location);
  url.searchParams.set('dates', `${startIso}/${endIso}`);

  return url.toString();
}

export function getOutlookCalendarUrl(params: CalendarEventParams): string {
  const { start, end } = parseCalendarDateTime(params.date, params.time, params.durationMinutes || 60);
  
  // Standard Outlook Web Calendar compose URL
  const url = new URL('https://outlook.live.com/calendar/0/action/compose');
  url.searchParams.set('rru', 'addevent');
  url.searchParams.set('subject', params.title);
  if (params.description) url.searchParams.set('body', params.description);
  if (params.location) url.searchParams.set('location', params.location);
  url.searchParams.set('startdt', start.toISOString());
  url.searchParams.set('enddt', end.toISOString());

  return url.toString();
}

export function downloadIcsFile(params: CalendarEventParams): void {
  const { start, end } = parseCalendarDateTime(params.date, params.time, params.durationMinutes || 60);
  const startIso = formatIsoForGCal(start);
  const endIso = formatIsoForGCal(end);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Harvard Business School//Section F App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:section-f-${Date.now()}@mba.hbs.edu`,
    `DTSTAMP:${startIso}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${params.title.replace(/,/g, '\\,')}`,
    params.description ? `DESCRIPTION:${params.description.replace(/\n/g, '\\n')}` : '',
    params.location ? `LOCATION:${params.location.replace(/,/g, '\\,')}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${params.title.replace(/,/g, '\\,')}`,
    `TRIGGER:-PT${params.alarmMinutesBefore !== undefined ? params.alarmMinutesBefore : 15}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${params.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


