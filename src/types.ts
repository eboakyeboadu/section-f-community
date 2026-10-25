export type HousingBuilding = 
  | 'Chase Hall'
  | 'Gallatin Hall'
  | 'Hamilton Hall'
  | 'McCulloch Hall'
  | 'Mellon Hall'
  | 'Morris Hall'
  | 'One Western Avenue'
  | 'Peabody Terrace'
  | 'Soldiers Field Park'
  | '100 South Campus Drive'
  | 'Off-Campus';

export type HousingType = 'dorm' | 'sfp' | 'owa' | 'peabody' | 'south_campus' | 'off_campus';

export type PrivacyLevel = 'share_all' | 'hide_contact_address';

export interface PartnerInfo {
  name?: string;
  affiliation?: string;
  contact?: string; // Open contact (Instagram, WhatsApp, LinkedIn, Email, etc.)
  photoUrl?: string;
  notes?: string;
}

export interface ChildInfo {
  name: string;
  ageOrYear: string; // e.g. "3 years" or "Born 2023"
}

export interface UnclaimedCard {
  id?: string;
  fullName: string;
  nickname?: string;
  pronunciation?: string;
  hometown?: string;
  homeCountry?: string;
  housing?: string;
  preHbsCompany?: string;
  preHbsRole?: string;
  companyUrl?: string;
  exploringInterests?: string[] | string;
  languages?: string[] | string;
  hobbies?: string;
  funFact?: string;
  venmo?: string;
  zelle?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notOnWhatsApp?: boolean;
  birthday?: string;
  claimed: boolean;
  claimedByUid?: string | null;
  claimedAt?: string | null;
}

export interface Profile {
  uid: string;
  fullName: string;
  nickname?: string;
  pronunciation?: string;
  email: string;
  authEmail?: string;
  unclaimedCardId?: string;
  phone?: string; // Standard mobile carrier phone for Calls / SMS / iMessage
  whatsapp?: string; // WhatsApp number (can be distinct international registered SIM)
  notOnWhatsApp?: boolean; // True if classmate opted out of WhatsApp
  instagramHandle?: string; // e.g. "@amara_o" or "amara_o"
  linkedinUrl?: string; // e.g. "https://linkedin.com/in/amaraokafor"
  birthday?: string; // e.g. "October 15" (Month & Day)
  birthdayMonth?: string;
  birthdayDay?: string;
  photoUrl: string; // Main headshot photo
  additionalPhotos?: string[]; // Up to 2 additional photos (family, hobbies, travel, etc.) - total 3
  homeCountry: string;
  countryCode: string; // ISO 2-letter (e.g. US, NG, GB)
  hometown: string;
  housingBuilding?: HousingBuilding;
  housingType: HousingType;
  housingDetail: string; // e.g. "Mellon Hall B-22", "Soldiers Field Park 3-104", "10 Akron St"
  preHbsCompany: string;
  preHbsRole: string;
  preHbsIndustry: string;
  companyUrl?: string;
  undergradSchool: string; // Undergraduate University
  undergradDegree?: string; // Undergraduate Degree / Major
  hasGraduateDegree?: boolean;
  graduateSchool?: string; // Graduate University
  graduateDegree?: string; // Graduate Degree / Program
  postHbsExploration: string[]; // e.g. ["Management Consulting", "Product Management", "Fintech"]
  languages: string[];
  countriesLived: string; // e.g. "USA (18y), UK (4y), Japan (2y)"
  funFact?: string;
  hobbies: string;
  venmoHandle?: string;
  zelleInfo?: string;
  hasPartner: boolean;
  partner?: PartnerInfo;
  hasChildren?: boolean;
  children?: ChildInfo[];
  childrenDetails?: string; // Display string e.g. "Maya (3 yrs), Leo (1 yr)"
  privacyLevel: PrivacyLevel;
  savedProfileUids?: string[]; // Array of bookmarked/favorited profile UIDs
  welcomeEmailSentAt?: string; // ISO timestamp when welcome email was dispatched
  welcomeEmailRecipient?: string; // Exact email address (authEmail) the welcome email was delivered to
  welcomeEmailMessageId?: string; // SMTP message ID
  createdAt: string;
  updatedAt: string;
  isCurrentUser?: boolean;
  isSample?: boolean; // Flag to identify sample / showcase profiles
}

export type TabType = 'cards' | 'spotlight' | 'calendar' | 'coffee_chats' | 'my_card';
export type CardSubView = 'deck' | 'infographics';

export type CohortEventType = 'birthday' | 'coffee_chat' | 'social' | 'academic' | 'sports' | 'other';

export interface SectionCohortEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD or Month Day
  time?: string; // e.g. "7:00 PM"
  location?: string;
  type: CohortEventType;
  partifulUrl?: string; // Partiful event or group RSVP link e.g. https://partiful.com/e/...
  createdByUid?: string;
  createdByName?: string;
  createdAt?: string;
}

export type CoffeeChatStatus = 'none' | 'request_sent' | 'scheduled' | 'completed';

export interface CoffeeChatRecord {
  classmateUid: string;
  status: CoffeeChatStatus;
  requestedAt?: string;
  completedAt?: string;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // e.g. "2:00 PM"
  notes?: string;
  takeaways?: string[];
  locationOrTopic?: string;
  updatedAt: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export interface CoffeeChatInvitation {
  id: string;
  senderUid: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  senderPhoto?: string;
  recipientUid: string;
  recipientName: string;
  recipientEmail: string;
  proposedDate: string; // e.g. "2026-10-16" or "Friday, Oct 16"
  proposedTime: string; // e.g. "10:30 AM" or "After RC Cases"
  location: string;     // e.g. "Spangler Lounge / Grille"
  templateType: 'casual' | 'career' | 'interests' | 'custom';
  channel?: 'email' | 'whatsapp' | 'in_app';
  message: string;
  status: InvitationStatus;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface FilterState {
  countries: string[];
  housingTypes: string[];
  industries: string[];
  explorations: string[];
  savedOnly?: boolean;
  searchQuery: string;
  // Optional legacy scalar compatibility fields
  country?: string | null;
  housingType?: string | null;
  industry?: string | null;
  exploration?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string; // e.g. `${minUid}_${maxUid}`
  senderUid: string;
  senderName: string;
  senderPhoto?: string;
  recipientUid: string;
  recipientName: string;
  message: string;
  read: boolean;
  createdAt: string;
  deletedForUids?: string[];
}


