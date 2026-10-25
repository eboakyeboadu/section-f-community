// SAMPLE ROSTER for the public demo.
// The real community roster is private and is NOT included in this repository.
// Replace these entries with your own community's data to deploy for real.

export interface SectionFMember {
  displayName: string; // e.g. "Jordan Sample"
  rawName: string;     // e.g. "Sample, Jordan"
  hbsEmail: string;    // community email address
  personalEmail?: string;
}

// Administrator accounts allowed to call mail/admin API endpoints.
// Configure real admins via the ADMIN_EMAILS environment variable instead.
export const AUTHORIZED_ADMIN_EMAILS = [
  'admin@example.com',
];

export const SECTION_F_ROSTER: SectionFMember[] = [
  { displayName: 'Jordan Sample', rawName: 'Sample, Jordan', hbsEmail: 'jordan.sample@example.com' },
  { displayName: 'Priya Raman', rawName: 'Raman, Priya', hbsEmail: 'priya.raman@example.com' },
  { displayName: 'Diego Fernandez', rawName: 'Fernandez, Diego', hbsEmail: 'diego.fernandez@example.com' },
  { displayName: 'Amara Osei', rawName: 'Osei, Amara', hbsEmail: 'amara.osei@example.com' },
  { displayName: 'Lucas Meyer', rawName: 'Meyer, Lucas', hbsEmail: 'lucas.meyer@example.com' },
  { displayName: 'Hana Suzuki', rawName: 'Suzuki, Hana', hbsEmail: 'hana.suzuki@example.com' },
  { displayName: 'Tom Walker', rawName: 'Walker, Tom', hbsEmail: 'tom.walker@example.com' },
  { displayName: 'Sofia Rossi', rawName: 'Rossi, Sofia', hbsEmail: 'sofia.rossi@example.com' },
];

const STORAGE_KEY_LINKED_GMAILS = 'section_f_linked_gmails';

export function getLinkedGmails(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LINKED_GMAILS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveLinkedGmail(gmail: string, hbsEmail: string): void {
  try {
    const cleanGmail = gmail.trim().toLowerCase();
    const cleanHbs = hbsEmail.trim().toLowerCase();
    const current = getLinkedGmails();
    current[cleanGmail] = cleanHbs;
    localStorage.setItem(STORAGE_KEY_LINKED_GMAILS, JSON.stringify(current));
  } catch (e) {}
}

/**
 * Checks if an email is a legitimate community member email:
 * - Matches a roster email address
 * - Matches a recorded personal email
 * - Matches an authorized admin email
 * - Matches a previously linked personal Gmail
 */
export function isValidSectionFEmail(rawEmail: string): boolean {
  if (!rawEmail) return false;
  const clean = rawEmail.trim().toLowerCase();

  // Admin emails
  if (AUTHORIZED_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === clean)) {
    return true;
  }

  // Official roster email list
  if (SECTION_F_ROSTER.some((m) => m.hbsEmail.toLowerCase() === clean)) {
    return true;
  }

  // Known personal emails from directory
  if (SECTION_F_ROSTER.some((m) => m.personalEmail && m.personalEmail.toLowerCase() === clean)) {
    return true;
  }

  // Linked Gmails in local storage
  const linked = getLinkedGmails();
  if (linked[clean]) {
    return true;
  }

  return false;
}

/**
 * Find the member associated with an email
 */
export function findSectionFMember(rawEmail: string): SectionFMember | undefined {
  if (!rawEmail) return undefined;
  const clean = rawEmail.trim().toLowerCase();

  // Match roster email
  const hbsMatch = SECTION_F_ROSTER.find((m) => m.hbsEmail.toLowerCase() === clean);
  if (hbsMatch) return hbsMatch;

  // Match known personal email
  const personalMatch = SECTION_F_ROSTER.find(
    (m) => m.personalEmail && m.personalEmail.toLowerCase() === clean
  );
  if (personalMatch) return personalMatch;

  // Match linked Gmail
  const linked = getLinkedGmails();
  const linkedHbs = linked[clean];
  if (linkedHbs) {
    return SECTION_F_ROSTER.find((m) => m.hbsEmail.toLowerCase() === linkedHbs.toLowerCase());
  }

  // If admin
  if (AUTHORIZED_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === clean)) {
    return {
      displayName: 'Admin User',
      rawName: 'Admin, Community',
      hbsEmail: clean,
    };
  }

  return undefined;
}
