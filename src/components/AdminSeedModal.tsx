import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Users, 
  X,
  Loader2,
  ShieldCheck,
  Mail,
  ExternalLink,
  Send,
  Search,
  Check,
  Clock,
  Copy,
  SendHorizontal,
  MailCheck,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Activity,
  MousePointerClick,
  LogIn,
  UserX,
  Coffee,
  Compass,
  Layers,
  Radio,
  TrendingUp,
  Percent,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Filter,
  Info,
  Phone,
  User,
  Smartphone,
  Bell,
  PenTool,
  Monitor,
  Eye,
  RotateCcw
} from 'lucide-react';
import { 
  seedUnclaimedCards, 
  seedLiveProfiles,
  subscribeToLiveProfiles,
  subscribeToUnclaimedCards,
  syncAuthorizedMembersToFirestore,
  resendWelcomeEmail
} from '../services/firebase';
import { 
  triggerTestEmail, 
  triggerSampleClaimInvitation, 
  triggerBatchClaimInvitations, 
  fetchScheduledCampaign,
  scheduleCohortCampaign,
  cancelScheduledCohortCampaign,
  triggerAdminSmsAlert,
  triggerSendCustomEmail,
  triggerRetryFailedCampaignInvitations,
  resetQuotaStatus,
  getNext8amEtSchedule,
  triggerSendIndividualClaimInvitation,
  BatchClaimRecipient,
  ScheduledCampaignInfo
} from '../services/emailService';
import { generateCustomEmailHtml } from '../services/emailTemplate';
import { 
  subscribeToAnalyticsSummary, 
  subscribeToRecentEvents, 
  AnalyticsSummary, 
  AnalyticsEventRecord 
} from '../services/analytics';
import { DEFAULT_SEED_CARDS } from '../data/seedCardsData';
import { SECTION_F_COHORT } from '../data/mockProfiles';
import { SECTION_F_ROSTER, findSectionFMember } from '../data/sectionFRoster';
import { UnclaimedCard, Profile } from '../types';

interface AdminSeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CohortMemberItem {
  id: string;
  uid?: string;
  fullName: string;
  hbsEmail: string;
  recipientEmail?: string;
  photoUrl?: string;
  isClaimed: boolean;
  welcomeEmailSentAt?: string;
  welcomeEmailMessageId?: string;
  profile?: Profile;
}

export type EmailTemplatePresetId = 'claim' | 'welcome' | 'coffee' | 'custom';

export interface EmailTemplatePreset {
  id: EmailTemplatePresetId;
  label: string;
  badge: string;
  subject: string;
  title: string;
  greeting: string;
  bodyText: string;
  bulletsText: string;
  buttonText: string;
  buttonUrl: string;
  footerText: string;
}

const EMAIL_PRESETS: Record<EmailTemplatePresetId, EmailTemplatePreset> = {
  claim: {
    id: 'claim',
    label: 'Claim Invitation',
    badge: 'ACTION REQUESTED · 30 SECONDS',
    subject: 'Your Section F Profile is Ready — Claim in 30 Seconds',
    title: 'Claim Your Section F Profile',
    greeting: 'Hi {{name}},',
    bodyText: 'Welcome! Your Section F profile has already been prepared on our community platform.\n\nPlease take 30 seconds to claim your card, verify your contact info, and upload a photo so your classmates can recognize you.',
    bulletsText: 'Search classmates by college, pre-MBA industry, and campus housing\nBook informal 1-on-1 coffee chats before orientation\nAccess the Section F classroom seating atlas and directory',
    buttonText: 'CLAIM YOUR PROFILE NOW',
    buttonUrl: 'https://sectionf28.ai.studio',
    footerText: 'Sample Section F community communication (demo).',
  },
  welcome: {
    id: 'welcome',
    label: 'Welcome & Hub Launch',
    badge: 'WELCOME TO SECTION F',
    title: 'Welcome to the Section F Community Hub!',
    subject: 'Welcome to Section F — Directory & Coffee Chats are Live',
    greeting: 'Hi Section F,',
    bodyText: "We're excited to launch the official Section F digital hub for the MBA Class of 2028.\n\nWhether you're already living in Soldiers Field Park, One Western Ave, or arriving in Boston next week, use this hub to discover your section-mates.",
    bulletsText: 'Browse interactive student profiles & background summaries\nSend 1-click Coffee Chat invites to connect before classes start\nFilter cohort members by undergraduate alma mater, language, and interests',
    buttonText: 'OPEN COMMUNITY HUB',
    buttonUrl: 'https://sectionf28.ai.studio',
    footerText: 'Designed for Section F, MBA 2028.',
  },
  coffee: {
    id: 'coffee',
    label: 'Coffee Chat Kickoff',
    badge: '1-ON-1 COFFEE CHATS',
    title: 'Section F Coffee Chats are Open!',
    subject: 'Grab coffee with a Section F classmate this week ☕',
    greeting: 'Hi {{name}},',
    bodyText: 'Orientation is right around the corner! Getting to know 90+ new classmates is one of the best parts of the HBS experience.\n\nWe have made it effortless to request 1-on-1 coffee meetups at Spangler, Chao, or Cambridge cafes.',
    bulletsText: 'Set your coffee preferences & favorite meetup spots\nSend an invite in 1 click directly from any classmate card\nTrack scheduled meetups directly in your profile',
    buttonText: 'BROWSE COFFEE CHATS',
    buttonUrl: 'https://sectionf28.ai.studio',
    footerText: 'Section F, MBA Class of 2028 (sample)',
  },
  custom: {
    id: 'custom',
    label: 'Custom Notice',
    badge: 'SECTION F ANNOUNCEMENT',
    title: 'Important Section F Update',
    subject: '[Section F] Community Announcement',
    greeting: 'Hi {{name}},',
    bodyText: 'We have a quick announcement for the Section F community.\n\nPlease take a moment to review the details below.',
    bulletsText: 'Keep your contact information updated\nReach out to the leadership team if you have questions',
    buttonText: 'VISIT SECTION F HUB',
    buttonUrl: 'https://sectionf28.ai.studio',
    footerText: 'Section F, MBA Class of 2028 (sample)',
  },
};

export const AdminSeedModal: React.FC<AdminSeedModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tracker' | 'analytics' | 'composer' | 'database'>('tracker');
  const [unclaimedCards, setUnclaimedCards] = useState<UnclaimedCard[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [customFileLoading, setCustomFileLoading] = useState<boolean>(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [resendingUid, setResendingUid] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Mobile Drill-Down & Collapse State
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [isCampaignControlsOpen, setIsCampaignControlsOpen] = useState<boolean>(false);
  const [analyticsFeedFilter, setAnalyticsFeedFilter] = useState<'all' | 'errors' | 'logins' | 'clicks' | 'coffee'>('all');
  const [selectedErrorCode, setSelectedErrorCode] = useState<string | null>(null);

  // Cohort claim invitation campaign state
  const [sampleLoading, setSampleLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [tempExcludeCourt, setTempExcludeCourt] = useState(true);
  const [showConfirmBatchModal, setShowConfirmBatchModal] = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState<ScheduledCampaignInfo | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [sendingIndividualEmail, setSendingIndividualEmail] = useState<string | null>(null);
  const [manualSentMap, setManualSentMap] = useState<Record<string, { sentAt: string; messageId?: string }>>(() => {
    try {
      const stored = localStorage.getItem('secf_manual_invitations');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Search & Filter state for tracker
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'pending' | 'unclaimed'>('all');

  // SMS Incident Alerting State
  const [adminPhone, setAdminPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('secf_admin_phone') || '';
    } catch {
      return '';
    }
  });
  const [smsAutoAlert, setSmsAutoAlert] = useState<boolean>(() => {
    try {
      return localStorage.getItem('secf_sms_auto_alert') === 'true';
    } catch {
      return false;
    }
  });
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real-time Cohort Analytics State
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>({
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
  });
  const [recentEvents, setRecentEvents] = useState<AnalyticsEventRecord[]>([]);

  // Retry campaign state
  const [retryLoading, setRetryLoading] = useState(false);
  const [isQuotaBlocked, setIsQuotaBlocked] = useState(false);
  const [copiedBcc, setCopiedBcc] = useState(false);

  // Email Studio / Composer State
  const [composerTemplate, setComposerTemplate] = useState<EmailTemplatePresetId>('claim');
  const [composerTargetType, setComposerTargetType] = useState<'admin' | 'classmate' | 'custom'>('admin');
  const [composerSelectedClassmateId, setComposerSelectedClassmateId] = useState<string>('');
  const [composerCustomTo, setComposerCustomTo] = useState<string>('');

  // Draft content fields with localStorage auto-recall
  const [composerSubject, setComposerSubject] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_subject');
      return saved !== null ? saved : EMAIL_PRESETS.claim.subject;
    } catch {
      return EMAIL_PRESETS.claim.subject;
    }
  });
  const [composerBadge, setComposerBadge] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_badge');
      return saved !== null ? saved : EMAIL_PRESETS.claim.badge;
    } catch {
      return EMAIL_PRESETS.claim.badge;
    }
  });
  const [composerTitle, setComposerTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_title');
      return saved !== null ? saved : EMAIL_PRESETS.claim.title;
    } catch {
      return EMAIL_PRESETS.claim.title;
    }
  });
  const [composerGreeting, setComposerGreeting] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_greeting');
      return saved !== null ? saved : EMAIL_PRESETS.claim.greeting;
    } catch {
      return EMAIL_PRESETS.claim.greeting;
    }
  });
  const [composerBodyText, setComposerBodyText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_body');
      return saved !== null ? saved : EMAIL_PRESETS.claim.bodyText;
    } catch {
      return EMAIL_PRESETS.claim.bodyText;
    }
  });
  const [composerBulletsText, setComposerBulletsText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_bullets');
      return saved !== null ? saved : EMAIL_PRESETS.claim.bulletsText;
    } catch {
      return EMAIL_PRESETS.claim.bulletsText;
    }
  });
  const [composerButtonText, setComposerButtonText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_button_text');
      return saved !== null ? saved : EMAIL_PRESETS.claim.buttonText;
    } catch {
      return EMAIL_PRESETS.claim.buttonText;
    }
  });
  const [composerButtonUrl, setComposerButtonUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_button_url');
      if (saved && (saved.includes('run.app') || saved.includes('ais-dev'))) {
        return 'https://sectionf28.ai.studio';
      }
      return saved !== null ? saved : EMAIL_PRESETS.claim.buttonUrl;
    } catch {
      return EMAIL_PRESETS.claim.buttonUrl;
    }
  });
  const [composerFooterText, setComposerFooterText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('secf_draft_footer');
      return saved !== null ? saved : EMAIL_PRESETS.claim.footerText;
    } catch {
      return EMAIL_PRESETS.claim.footerText;
    }
  });

  const [composerMobileView, setComposerMobileView] = useState<'editor' | 'preview'>('editor');
  const [composerDeviceWidth, setComposerDeviceWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [composerSending, setComposerSending] = useState(false);
  const [composerStatus, setComposerStatus] = useState<{ type: 'success' | 'error'; text: string; messageId?: string } | null>(null);
  const [showComposerConfirmModal, setShowComposerConfirmModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubProfiles = subscribeToLiveProfiles((p) => setProfiles(p));
    const unsubUnclaimed = subscribeToUnclaimedCards((c) => setUnclaimedCards(c));
    const unsubSummary = subscribeToAnalyticsSummary((data) => setAnalyticsSummary(data));
    const unsubEvents = subscribeToRecentEvents((events) => setRecentEvents(events), 25);

    // Fetch active scheduled campaign and quota health from server
    fetchScheduledCampaign().then((res) => {
      if (res.success && res.campaign) {
        setScheduledInfo(res.campaign);
      }
      if (res.isGmailQuotaBlocked || res.campaign?.status === 'quota_exceeded') {
        setIsQuotaBlocked(true);
      } else {
        setIsQuotaBlocked(false);
      }
    });

    return () => {
      unsubProfiles();
      unsubUnclaimed();
      unsubSummary();
      unsubEvents();
    };
  }, [isOpen]);

  // Build unified cohort items
  const cohortItems: CohortMemberItem[] = useMemo(() => {
    const items: CohortMemberItem[] = [];
    const processedProfileUids = new Set<string>();

    unclaimedCards.forEach((card, idx) => {
      const cardId = card.id || `card_${idx}`;
      const matchingProfile = profiles.find(
        (p) => 
          (p.unclaimedCardId && p.unclaimedCardId === cardId) ||
          (card.claimedByUid && p.uid === card.claimedByUid) ||
          (p.email && card.email && p.email.toLowerCase() === card.email.toLowerCase())
      );

      if (matchingProfile) {
        processedProfileUids.add(matchingProfile.uid);
        items.push({
          id: cardId,
          uid: matchingProfile.uid,
          fullName: matchingProfile.fullName || card.fullName || 'Classmate',
          hbsEmail: card.email || matchingProfile.email || '',
          recipientEmail: matchingProfile.welcomeEmailRecipient || matchingProfile.authEmail || matchingProfile.email,
          photoUrl: matchingProfile.photoUrl,
          isClaimed: true,
          welcomeEmailSentAt: matchingProfile.welcomeEmailSentAt,
          welcomeEmailMessageId: matchingProfile.welcomeEmailMessageId,
          profile: matchingProfile,
        });
      } else {
        items.push({
          id: cardId,
          fullName: card.fullName || 'Classmate',
          hbsEmail: card.email || '',
          isClaimed: !!card.claimed,
        });
      }
    });

    profiles.forEach((p) => {
      if (!processedProfileUids.has(p.uid)) {
        items.push({
          id: p.uid,
          uid: p.uid,
          fullName: p.fullName || 'Classmate',
          hbsEmail: p.email || '',
          recipientEmail: p.welcomeEmailRecipient || p.authEmail || p.email,
          photoUrl: p.photoUrl,
          isClaimed: true,
          welcomeEmailSentAt: p.welcomeEmailSentAt,
          welcomeEmailMessageId: p.welcomeEmailMessageId,
          profile: p,
        });
      }
    });

    return items.sort((a, b) => {
      if (a.welcomeEmailSentAt && !b.welcomeEmailSentAt) return -1;
      if (!a.welcomeEmailSentAt && b.welcomeEmailSentAt) return 1;
      if (a.isClaimed && !b.isClaimed) return -1;
      if (!a.isClaimed && b.isClaimed) return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [unclaimedCards, profiles]);

  // Metric counts
  const totalCohortCount = cohortItems.length;
  const deliveredCount = cohortItems.filter((i) => !!i.welcomeEmailSentAt).length;
  const pendingCount = cohortItems.filter((i) => i.isClaimed && !i.welcomeEmailSentAt).length;
  const unclaimedCount = cohortItems.filter((i) => !i.isClaimed).length;

  // Filtered cohort items
  const filteredItems = useMemo(() => {
    return cohortItems.filter((item) => {
      const matchesSearch = 
        !searchTerm.trim() ||
        item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.hbsEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.recipientEmail && item.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'delivered') return !!item.welcomeEmailSentAt;
      if (statusFilter === 'pending') return item.isClaimed && !item.welcomeEmailSentAt;
      if (statusFilter === 'unclaimed') return !item.isClaimed;
      return true;
    });
  }, [cohortItems, searchTerm, statusFilter]);

  // Filtered telemetry events for real-time inspection
  const filteredEvents = useMemo(() => {
    return recentEvents.filter((ev) => {
      if (selectedErrorCode) {
        if (ev.eventType !== 'login_failed') return false;
        return ev.metadata?.errorCode === selectedErrorCode;
      }
      if (analyticsFeedFilter === 'errors') return ev.eventType === 'login_failed';
      if (analyticsFeedFilter === 'logins') return ev.eventType.startsWith('login_');
      if (analyticsFeedFilter === 'clicks') return ev.eventType === 'email_link_clicked';
      if (analyticsFeedFilter === 'coffee') return ev.eventType.includes('coffee');
      return true;
    });
  }, [recentEvents, selectedErrorCode, analyticsFeedFilter]);

  const handleCopyMessageId = (msgId: string) => {
    navigator.clipboard.writeText(msgId);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleResendWelcome = async (item: CohortMemberItem) => {
    if (!item.uid || !item.profile) return;
    try {
      setResendingUid(item.uid);
      setStatusMessage({
        type: 'info',
        text: `Dispatching welcome email to ${item.recipientEmail || item.fullName}...`
      });

      const res = await resendWelcomeEmail(item.uid, item.profile);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `✓ Welcome email successfully delivered to ${res.recipient}! (Msg ID: ${res.messageId || 'sent'})`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Delivery failed: ${res.error || 'Server error'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error resending email: ${err?.message || 'Network error'}`
      });
    } finally {
      setResendingUid(null);
    }
  };

  // Compute eligible unclaimed cohort members for the 30-sec claim invitation campaign
  const eligibleUnclaimedMembers = useMemo(() => {
    const excludedScheduledSet = new Set(
      (scheduledInfo?.excludedEmails || []).map((e) => e.toLowerCase())
    );
    return cohortItems.filter((item) => {
      if (item.isClaimed) return false;
      if (!item.hbsEmail) return false;
      const lower = item.hbsEmail.toLowerCase();
      // Exclude if already manually sent
      if (manualSentMap[lower]) return false;
      // Exclude if already in schedule exclusion list
      if (excludedScheduledSet.has(lower)) return false;
      if (tempExcludeCourt) {
        if (lower === 'demo.excluded@example.com' || lower === 'demo.excluded.personal@example.com') return false;
        if (item.fullName.toLowerCase().includes('court adams')) return false;
      }
      return true;
    });
  }, [cohortItems, tempExcludeCourt, scheduledInfo?.excludedEmails, manualSentMap]);

  // Handler for individual manual invitation send
  const handleSendIndividualClaim = async (item: { id: string; fullName: string; hbsEmail: string }) => {
    if (!item.hbsEmail) {
      setStatusMessage({ type: 'error', text: 'No HBS email address found for this classmate.' });
      return;
    }

    const emailKey = item.hbsEmail.toLowerCase();
    try {
      setSendingIndividualEmail(emailKey);
      setStatusMessage({
        type: 'info',
        text: `Sending individual claim invitation to ${item.fullName} (${item.hbsEmail}) via Google SMTP...`
      });

      const res = await triggerSendIndividualClaimInvitation({
        classmateId: item.id,
        fullName: item.fullName,
        hbsEmail: item.hbsEmail,
      });

      if (res.success) {
        const updatedMap = {
          ...manualSentMap,
          [emailKey]: {
            sentAt: new Date().toISOString(),
            messageId: res.messageId
          }
        };
        setManualSentMap(updatedMap);
        try {
          localStorage.setItem('secf_manual_invitations', JSON.stringify(updatedMap));
        } catch {}

        if (res.campaign) {
          setScheduledInfo(res.campaign);
        } else {
          const refreshed = await fetchScheduledCampaign();
          if (refreshed.success && refreshed.campaign) {
            setScheduledInfo(refreshed.campaign);
          }
        }

        setStatusMessage({
          type: 'success',
          text: `✓ Claim invitation sent to ${item.fullName}! Excluded from tomorrow's 8:00 AM scheduled drip queue.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Failed to dispatch invitation to ${item.fullName}: ${res.error || 'Server error'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error sending individual invitation: ${err?.message || 'Network error'}`
      });
    } finally {
      setSendingIndividualEmail(null);
    }
  };

  // Sync draft edits to localStorage for auto-save persistence
  useEffect(() => {
    try {
      localStorage.setItem('secf_draft_subject', composerSubject);
      localStorage.setItem('secf_draft_badge', composerBadge);
      localStorage.setItem('secf_draft_title', composerTitle);
      localStorage.setItem('secf_draft_greeting', composerGreeting);
      localStorage.setItem('secf_draft_body', composerBodyText);
      localStorage.setItem('secf_draft_bullets', composerBulletsText);
      localStorage.setItem('secf_draft_button_text', composerButtonText);
      localStorage.setItem('secf_draft_button_url', composerButtonUrl);
      localStorage.setItem('secf_draft_footer', composerFooterText);
    } catch {}
  }, [
    composerSubject,
    composerBadge,
    composerTitle,
    composerGreeting,
    composerBodyText,
    composerBulletsText,
    composerButtonText,
    composerButtonUrl,
    composerFooterText,
  ]);

  const handleApplyTemplate = (presetId: EmailTemplatePresetId) => {
    const preset = EMAIL_PRESETS[presetId];
    if (!preset) return;
    setComposerTemplate(presetId);
    setComposerSubject(preset.subject);
    setComposerBadge(preset.badge);
    setComposerTitle(preset.title);
    setComposerGreeting(preset.greeting);
    setComposerBodyText(preset.bodyText);
    setComposerBulletsText(preset.bulletsText);
    setComposerButtonText(preset.buttonText);
    setComposerButtonUrl(preset.buttonUrl);
    setComposerFooterText(preset.footerText);
    setComposerStatus(null);
  };

  const handleResetToTemplate = () => {
    handleApplyTemplate(composerTemplate);
  };

  // Find selected cohort member for Email Studio
  const selectedComposerMember = useMemo(() => {
    if (!composerSelectedClassmateId) return cohortItems[0] || null;
    return cohortItems.find((m) => m.id === composerSelectedClassmateId || m.uid === composerSelectedClassmateId) || cohortItems[0] || null;
  }, [cohortItems, composerSelectedClassmateId]);

  // Resolve target email and display name for draft dispatch
  const resolvedRecipient = useMemo(() => {
    if (composerTargetType === 'admin') {
      return {
        email: 'admin@example.com',
        name: 'Admin',
        description: 'Administrator (admin@example.com)'
      };
    }
    if (composerTargetType === 'classmate') {
      const email = selectedComposerMember?.hbsEmail || selectedComposerMember?.recipientEmail || '';
      const name = selectedComposerMember?.fullName || 'Classmate';
      return {
        email,
        name,
        description: `${name} (${email})`
      };
    }
    const cleanCustom = composerCustomTo.trim();
    return {
      email: cleanCustom,
      name: cleanCustom.split('@')[0] || 'Recipient',
      description: cleanCustom || 'Custom Recipient'
    };
  }, [composerTargetType, selectedComposerMember, composerCustomTo]);

  // Compute live HTML preview with token replacements
  const previewHtml = useMemo(() => {
    const targetName = resolvedRecipient.name || 'Classmate';
    const dynamicGreeting = composerGreeting.replace(/{{name}}/gi, targetName);
    const dynamicTitle = composerTitle.replace(/{{name}}/gi, targetName);
    const dynamicSubject = composerSubject.replace(/{{name}}/gi, targetName);

    const paragraphs = composerBodyText
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => p.replace(/{{name}}/gi, targetName));

    const bullets = composerBulletsText
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => b.replace(/{{name}}/gi, targetName));

    return generateCustomEmailHtml({
      recipientName: targetName,
      badge: composerBadge,
      title: dynamicTitle,
      greeting: dynamicGreeting,
      paragraphs: paragraphs.length > 0 ? paragraphs : ['Write your custom email content in the editor.'],
      bullets,
      buttonText: composerButtonText,
      buttonUrl: composerButtonUrl,
      footerText: composerFooterText,
      preheader: dynamicSubject,
    });
  }, [
    resolvedRecipient,
    composerGreeting,
    composerTitle,
    composerSubject,
    composerBodyText,
    composerBulletsText,
    composerBadge,
    composerButtonText,
    composerButtonUrl,
    composerFooterText,
  ]);

  const handleSendDraftEmail = async (overrideTo?: string, overrideName?: string) => {
    const to = overrideTo || resolvedRecipient.email;
    const recipientName = overrideName || resolvedRecipient.name;

    if (!to || !to.includes('@')) {
      setComposerStatus({ type: 'error', text: 'Please specify a valid recipient email address with @.' });
      return;
    }

    try {
      setComposerSending(true);
      setComposerStatus(null);
      const res = await triggerSendCustomEmail({
        to,
        recipientName,
        subject: composerSubject.replace(/{{name}}/gi, recipientName),
        html: previewHtml,
        text: composerBodyText.replace(/{{name}}/gi, recipientName),
      });

      if (res.success) {
        setComposerStatus({
          type: 'success',
          text: `✓ Email successfully dispatched to ${to}! (Nodemailer Pool)`,
          messageId: res.messageId
        });
        setShowComposerConfirmModal(false);
      } else {
        setComposerStatus({
          type: 'error',
          text: `Failed to dispatch: ${res.error || 'Server error'}`
        });
      }
    } catch (err: any) {
      setComposerStatus({
        type: 'error',
        text: `Error sending email: ${err?.message || 'Network error'}`
      });
    } finally {
      setComposerSending(false);
    }
  };

  // Identify failed campaign recipients for 1-click retry
  const failedCampaignRecipients = useMemo(() => {
    if (!scheduledInfo?.results || !Array.isArray(scheduledInfo.results)) return [];
    return scheduledInfo.results.filter((r: { success?: boolean }) => !r.success);
  }, [scheduledInfo]);

  const handleRetryFailedCampaign = async () => {
    try {
      setRetryLoading(true);
      setStatusMessage({ type: 'info', text: 'Retrying failed campaign deliveries via connection pool...' });
      const res = await triggerRetryFailedCampaignInvitations();

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `✓ Retry completed: ${res.newSuccessCount} of ${res.totalRetried} previously failed invitations were successfully delivered! (Total delivered: ${res.totalDelivered})`
        });
        // Refresh scheduled campaign info
        const refreshed = await fetchScheduledCampaign();
        if (refreshed.success && refreshed.campaign) {
          setScheduledInfo(refreshed.campaign);
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: `Retry encountered an error: ${res.error || 'Server error'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error retrying campaign: ${err?.message || 'Network error'}`
      });
    } finally {
      setRetryLoading(false);
    }
  };

  const handleSendSampleClaimEmail = async () => {
    try {
      setSampleLoading(true);
      setStatusMessage({
        type: 'info',
        text: 'Dispatching sample claim invitation email to admin@example.com via Gmail SMTP...'
      });
      const res = await triggerSampleClaimInvitation('admin@example.com', 'Admin');
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: '✓ Sample Claim Invitation sent to admin@example.com! Please check your inbox or spam.'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Sample dispatch failed: ${res.error || 'Check SMTP configuration'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error sending sample: ${err?.message || 'Network error'}`
      });
    } finally {
      setSampleLoading(false);
    }
  };

  const handleExecuteBatchCampaign = async () => {
    setShowConfirmBatchModal(false);
    try {
      setBatchLoading(true);
      setStatusMessage({
        type: 'info',
        text: `Launching batch onboarding campaign to ${eligibleUnclaimedMembers.length} classmates...`
      });

      const batchPayload: BatchClaimRecipient[] = eligibleUnclaimedMembers.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        hbsEmail: m.hbsEmail,
      }));

      const excludedEmails = tempExcludeCourt ? ['demo.excluded@example.com', 'demo.excluded.personal@example.com'] : [];
      const res = await triggerBatchClaimInvitations(batchPayload, excludedEmails);

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `✓ Successfully dispatched onboarding invitations to ${res.totalSent} classmates! (Rate-limited via Gmail SMTP)`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Batch campaign encountered an issue: ${res.error || 'Server error'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error during batch campaign: ${err?.message || 'Network error'}`
      });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleArmSchedule = async () => {
    try {
      setScheduleLoading(true);
      const nextSchedule = getNext8amEtSchedule();
      setStatusMessage({
        type: 'info',
        text: `Arming server scheduler for ${nextSchedule.display} (2-Hour Buffer Window)...`
      });

      const batchPayload: BatchClaimRecipient[] = eligibleUnclaimedMembers.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        hbsEmail: m.hbsEmail,
      }));

      const res = await scheduleCohortCampaign({
        scheduledTime: nextSchedule.iso,
        displayTime: nextSchedule.display,
        timeFrameWindow: nextSchedule.timeFrameWindow,
        pacingIntervalSeconds: 60,
        recipients: batchPayload,
        excludedEmails: tempExcludeCourt ? ['demo.excluded@example.com', 'demo.excluded.personal@example.com'] : []
      });

      if (res.success && res.campaign) {
        setScheduledInfo(res.campaign);
        setStatusMessage({
          type: 'success',
          text: `✓ Email campaign successfully scheduled for ${nextSchedule.display}! The server will dispatch automatically.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Failed to arm scheduler: ${res.error || 'Server error'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error arming scheduler: ${err?.message || 'Network error'}`
      });
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleCopyUnsentBccList = () => {
    const emails = eligibleUnclaimedMembers.map((m) => m.hbsEmail).filter(Boolean).join(', ');
    if (!emails) {
      setStatusMessage({ type: 'info', text: 'No pending unclaimed classmate emails to copy.' });
      return;
    }
    navigator.clipboard.writeText(emails);
    setCopiedBcc(true);
    setStatusMessage({
      type: 'success',
      text: `✓ Copied ${eligibleUnclaimedMembers.length} pending classmate emails to clipboard! Paste directly into BCC field in Outlook/Gmail.`
    });
    setTimeout(() => setCopiedBcc(false), 2500);
  };

  const handleResetQuota = async () => {
    try {
      setStatusMessage({ type: 'info', text: 'Testing/resetting Gmail quota status flag on server...' });
      const res = await resetQuotaStatus();
      if (res.success) {
        setIsQuotaBlocked(false);
        setStatusMessage({
          type: 'success',
          text: '✓ Quota flag reset. You may now test a sample email or schedule the next batch.'
        });
        const refreshed = await fetchScheduledCampaign();
        if (refreshed.campaign) {
          setScheduledInfo(refreshed.campaign);
        }
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to reset quota status' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Network error' });
    }
  };

  const handleCancelSchedule = async () => {
    try {
      setScheduleLoading(true);
      const res = await cancelScheduledCohortCampaign();
      if (res.success) {
        setScheduledInfo(null);
        setStatusMessage({
          type: 'info',
          text: 'Scheduled campaign has been cancelled.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error cancelling schedule: ${err?.message || 'Network error'}`
      });
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSeedDefaultCards = async () => {
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'Seeding Section F directory into unclaimed_cards...' });
      const count = await seedUnclaimedCards(DEFAULT_SEED_CARDS);
      setStatusMessage({
        type: 'success',
        text: `Successfully seeded ${count} classmates into unclaimed_cards collection!`
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Error seeding cards: ${err?.message || 'Check Firestore permissions'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedLiveProfiles = async () => {
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'Seeding 32 classmate cards directly into Firestore profiles collection...' });
      const count = await seedLiveProfiles(SECTION_F_COHORT);
      setStatusMessage({
        type: 'success',
        text: `Successfully seeded ${count} classmates into profiles collection! Deck and views are fully active.`
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Error seeding profiles: ${err?.message || 'Check Firestore permissions'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRoster = async () => {
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'Syncing Section F roster into Firestore authorized_members collection...' });
      const count = await syncAuthorizedMembersToFirestore(SECTION_F_ROSTER);
      setStatusMessage({
        type: 'success',
        text: `Successfully synced ${count} authorized classmate emails (including the demo admin) to Firestore!`
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Error syncing roster: ${err?.message || 'Check Firestore permissions'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setEmailLoading(true);
      setStatusMessage({ type: 'info', text: 'Sending test welcome email to admin@example.com via Gmail SMTP...' });
      const res = await triggerTestEmail('admin@example.com', 'Admin');
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: '✓ Test Welcome Email successfully delivered to admin@example.com! Please check your inbox or spam folder.'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Email delivery failed: ${res.error || 'Check SMTP configuration'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error dispatching email: ${err?.message || 'Server error'}`
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    setCustomFileLoading(true);
    setStatusMessage({ type: 'info', text: `Reading ${file.name}...` });

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        let items: Partial<UnclaimedCard>[] = [];

        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && Array.isArray(parsed.cards)) {
          items = parsed.cards;
        } else if (parsed && Array.isArray(parsed.unclaimed_cards)) {
          items = parsed.unclaimed_cards;
        } else {
          throw new Error('JSON file must be an array of cards or contain a "cards" array.');
        }

        const count = await seedUnclaimedCards(items);
        setStatusMessage({
          type: 'success',
          text: `Successfully parsed and seeded ${count} cards from ${file.name} into unclaimed_cards!`
        });
      } catch (err: any) {
        console.error(err);
        setStatusMessage({
          type: 'error',
          text: `Failed to import JSON: ${err.message || 'Invalid JSON format'}`
        });
      } finally {
        setCustomFileLoading(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setStatusMessage({ type: 'error', text: 'Error reading selected file.' });
      setCustomFileLoading(false);
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleSavePhone = (value: string) => {
    setAdminPhone(value);
    try {
      localStorage.setItem('secf_admin_phone', value);
    } catch {}
  };

  const handleToggleSmsAutoAlert = (checked: boolean) => {
    setSmsAutoAlert(checked);
    try {
      localStorage.setItem('secf_sms_auto_alert', checked ? 'true' : 'false');
    } catch {}
  };

  const handleSendTestSms = async () => {
    const rawDigits = adminPhone.replace(/\D/g, '');
    const cleanDigits = rawDigits.length === 11 && rawDigits.startsWith('1') ? rawDigits.slice(1) : rawDigits;

    if (!cleanDigits || cleanDigits.length !== 10) {
      setSmsStatus({ type: 'error', text: 'Enter a valid 10-digit US mobile number (e.g. 617-555-0199).' });
      return;
    }

    try {
      setSmsLoading(true);
      setSmsStatus(null);
      const res = await triggerAdminSmsAlert({
        phoneNumber: cleanDigits,
        alertType: 'test',
      });

      if (res.success) {
        setSmsStatus({
          type: 'success',
          text: `✓ Test SMS dispatched to ${cleanDigits}! Please check your text messages.`,
        });
      } else {
        setSmsStatus({
          type: 'error',
          text: res.error || 'Failed to dispatch SMS alert.',
        });
      }
    } catch (err: any) {
      setSmsStatus({
        type: 'error',
        text: err?.message || 'Server network error.',
      });
    } finally {
      setSmsLoading(false);
    }
  };

  const formatDeliveryTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className={`w-full h-full sm:h-auto sm:max-h-[92dvh] ${activeTab === 'composer' ? 'max-w-5xl' : 'max-w-3xl'} bg-[#171226] border-0 sm:border border-[#3A2D5C] rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200`}>
        {/* Header */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-[#2E1F4D] to-[#1E1436] border-b border-[#3A2D5C] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B] shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-lg text-white truncate">Cohort & Email Administration</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Real-time welcome email tracking & telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2E244A] bg-[#110C1E] px-2 sm:px-4 pt-1.5 sm:pt-2 overflow-x-auto no-scrollbar whitespace-nowrap gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'tracker'
                ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MailCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Tracker</span>
            <span className="hidden sm:inline">Delivery Tracker</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {deliveredCount}/{totalCohortCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span className="sm:hidden">Analytics</span>
            <span className="hidden sm:inline">App & Email Analytics</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </button>
          <button
            onClick={() => setActiveTab('composer')}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'composer'
                ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
            <span className="sm:hidden">Email Studio</span>
            <span className="hidden sm:inline">Email Studio</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              HTML
            </span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'database'
                ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Database</span>
            <span className="hidden sm:inline">Database & Tools</span>
          </button>
        </div>

        {/* Feedback status banner */}
        {statusMessage && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl border text-xs sm:text-sm flex items-start space-x-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-700/50 text-rose-300'
                : 'bg-purple-950/40 border-purple-700/50 text-purple-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
            <button 
              onClick={() => setStatusMessage(null)} 
              className="text-slate-400 hover:text-white text-xs ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {activeTab === 'tracker' && (
            /* TAB 1: EMAIL DELIVERY TRACKER */
            <div className="space-y-4">
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center space-x-1 sm:space-x-1.5 mb-0.5 sm:mb-1">
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">Cohort Total</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white">{totalCohortCount}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">Section F Roster</div>
                </div>

                <div className="p-2.5 sm:p-3 bg-[#0B0813] border border-emerald-900/40 rounded-xl">
                  <div className="text-[10px] sm:text-[11px] text-emerald-300 flex items-center space-x-1 sm:space-x-1.5 mb-0.5 sm:mb-1">
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Delivered</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-400">{deliveredCount}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">Via Gmail SMTP</div>
                </div>

                <div className="p-2.5 sm:p-3 bg-[#0B0813] border border-amber-900/40 rounded-xl">
                  <div className="text-[10px] sm:text-[11px] text-amber-300 flex items-center space-x-1 sm:space-x-1.5 mb-0.5 sm:mb-1">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Pending Send</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-amber-400">{pendingCount}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">Claimed, no email</div>
                </div>

                <div className="p-2.5 sm:p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center space-x-1 sm:space-x-1.5 mb-0.5 sm:mb-1">
                    <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Unclaimed</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-300">{unclaimedCount}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">Cards in waiting</div>
                </div>
              </div>

              {/* Mobile Compact Campaign Bar */}
              <div className="sm:hidden p-2.5 bg-gradient-to-r from-purple-900/40 via-amber-950/30 to-[#160F26] border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">
                      {scheduledInfo?.status === 'scheduled' ? '⏰ 8:00 AM Campaign Armed' : 'Onboarding Campaign'}
                    </div>
                    <div className="text-[10px] text-amber-300/90 truncate">
                      {eligibleUnclaimedMembers.length} unclaimed classmates ready
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCampaignControlsOpen(!isCampaignControlsOpen)}
                  className="px-2.5 py-1 bg-[#2E2045] hover:bg-[#3D2A5C] text-amber-300 font-semibold rounded-lg text-xs border border-amber-500/30 shrink-0 cursor-pointer transition-all flex items-center space-x-1"
                >
                  <span>{isCampaignControlsOpen ? 'Hide' : 'Manage'}</span>
                  {isCampaignControlsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Cohort Onboarding Claim Campaign Card */}
              <div className={`${isCampaignControlsOpen ? 'block' : 'hidden sm:block'} p-3 sm:p-4 bg-gradient-to-br from-[#1C1236] to-[#0E091D] border border-purple-500/30 rounded-2xl space-y-3 shadow-lg`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Cohort Onboarding Campaign (30-Sec Claim Invitations)</h4>
                      <p className="text-[11px] text-slate-400">
                        Invites unclaimed classmates to claim their profile, upload photos, and connect.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
                    Official @mba2028.hbs.edu Only
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                    <div className="text-[10px] text-slate-400">Target Recipients</div>
                    <div className="font-bold text-white text-base mt-0.5">{eligibleUnclaimedMembers.length} Unclaimed</div>
                    <div className="text-[10px] text-emerald-400">Ready to invite</div>
                  </div>
                  <div className="p-2.5 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                    <div className="text-[10px] text-slate-400">Excluded (Active)</div>
                    <div className="font-bold text-white text-base mt-0.5">{deliveredCount} Claimed</div>
                    <div className="text-[10px] text-slate-500">Daffy, Angus, Sarah, Eben</div>
                  </div>
                  <div className="p-2.5 bg-[#0B0813] border border-[#2E244A] rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Temporary Exclusion</div>
                      <div className="font-bold text-amber-300 text-xs mt-0.5">Court Adams</div>
                    </div>
                    <label className="flex items-center space-x-1.5 text-[10px] text-slate-400 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={tempExcludeCourt}
                        onChange={(e) => setTempExcludeCourt(e.target.checked)}
                        className="rounded border-[#3A2D5C] bg-[#171226] text-[#F59E0B] focus:ring-0 cursor-pointer"
                      />
                      <span>Exclude Court for now</span>
                    </label>
                  </div>
                </div>

                {/* Schedule Status Banner */}
                {scheduledInfo?.status === 'scheduled' ? (
                  <div className="p-3 bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-[#160F26] border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                        <Clock className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5 flex-wrap">
                          <span>⏰ Scheduled for {scheduledInfo.displayTime || '8:00 AM ET'}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold font-mono">
                            Armed · 1 Email / Min
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          {scheduledInfo.timeFrameWindow || '8:00 AM – 10:00 AM ET (2-Hour Buffer Window)'} · Paced across 120 mins via Google SMTP.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleCancelSchedule}
                        disabled={scheduleLoading}
                        className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 font-semibold rounded-lg text-xs cursor-pointer transition-all"
                      >
                        Cancel Schedule
                      </button>
                    </div>
                  </div>
                ) : scheduledInfo?.status === 'running' ? (
                  <div className="p-3 bg-gradient-to-r from-purple-950/80 via-indigo-950/60 to-[#1C1236] border border-purple-500/50 rounded-xl space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                            <span>2-Hour Staggered Dispatch in Progress</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 border border-purple-500/50 font-semibold font-mono animate-pulse">
                              1 Email / Min
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            Progress: {scheduledInfo.totalSent || 0} of {scheduledInfo.totalAttempted || eligibleUnclaimedMembers.length} delivered
                            {scheduledInfo.currentRecipientName ? ` · Last: ${scheduledInfo.currentRecipientName}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleCancelSchedule}
                        disabled={scheduleLoading}
                        className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 font-semibold rounded-lg text-xs cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="w-full bg-[#120E22] rounded-full h-1.5 overflow-hidden border border-[#2E244A]">
                      <div 
                        className="bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round(((scheduledInfo.totalSent || 0) / Math.max(1, (scheduledInfo.totalAttempted || eligibleUnclaimedMembers.length))) * 100))}%` }}
                      />
                    </div>
                  </div>
                ) : (scheduledInfo?.status === 'quota_exceeded' || isQuotaBlocked) ? (
                  <div className="p-3 bg-gradient-to-r from-amber-950/80 via-rose-950/60 to-[#1C1236] border border-amber-500/50 rounded-xl space-y-2.5 shadow-md">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center space-x-1.5 flex-wrap">
                            <span>Gmail Daily Sending Limit Reached (550-5.4.5)</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold font-mono">
                              Circuit Breaker Tripped
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Google enforces a daily 500-recipient sending ceiling for personal Gmail accounts. The background loop paused automatically to prevent account suspension. Google automatically resets this rolling quota in 24 hours.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#3A2D5C]/60">
                      <button
                        onClick={handleCopyUnsentBccList}
                        className="px-2.5 py-1.5 bg-[#231A38] hover:bg-[#2D2147] border border-amber-500/40 text-amber-300 font-semibold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-all"
                        title="Copy comma-separated list of all pending classmate emails for pasting into your Outlook or Gmail BCC field"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedBcc ? '✓ Emails Copied!' : `Copy ${eligibleUnclaimedMembers.length} Unsent Emails (BCC)`}</span>
                      </button>

                      <button
                        onClick={handleArmSchedule}
                        disabled={scheduleLoading}
                        className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Arm for Next 8:00 AM ET</span>
                      </button>

                      <button
                        onClick={handleResetQuota}
                        className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs flex items-center space-x-1 cursor-pointer transition-all"
                        title="Test or clear quota status if 24 hours have elapsed"
                      >
                        <RefreshCw className="w-3 h-3 text-slate-400" />
                        <span>Test Reset</span>
                      </button>
                    </div>
                  </div>
                ) : scheduledInfo?.status === 'completed' ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Campaign completed! Dispatched to {scheduledInfo.totalSent} classmates.</span>
                    </div>

                    {failedCampaignRecipients.length > 0 && (
                      <div className="p-3 bg-gradient-to-r from-rose-950/70 to-amber-950/40 border border-rose-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                        <div className="flex items-start sm:items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                              <span>{failedCampaignRecipients.length} Invitations Throttled / Pending</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold font-mono">
                                Action Needed
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300 mt-0.5">
                              Pooled SMTP connection with 1.5s delay and circuit-breaker is active. Only unsent classmates will be messaged — no duplicates.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleRetryFailedCampaign}
                          disabled={retryLoading}
                          className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow cursor-pointer transition-all shrink-0 disabled:opacity-50"
                        >
                          {retryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          <span>Retry {failedCampaignRecipients.length} Failed</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={handleSendSampleClaimEmail}
                    disabled={sampleLoading}
                    className="py-2.5 px-3 bg-[#231A38] hover:bg-[#2D2147] border border-purple-500/40 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {sampleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-amber-400" />}
                    <span>Send Sample to me</span>
                  </button>
                  
                  {scheduledInfo?.status !== 'scheduled' ? (
                    <button
                      onClick={handleArmSchedule}
                      disabled={scheduleLoading || eligibleUnclaimedMembers.length === 0}
                      className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
                    >
                      {scheduleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5 text-black" />}
                      <span>Schedule for 8:00 AM ET ({eligibleUnclaimedMembers.length})</span>
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-semibold space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Armed for 8:00 AM ET</span>
                    </div>
                  )}

                  <button
                    onClick={() => setShowConfirmBatchModal(true)}
                    disabled={batchLoading || eligibleUnclaimedMembers.length === 0}
                    className="py-2.5 px-3 bg-[#231A38] hover:bg-[#2D2147] border border-[#3A2D5C] text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {batchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Send Now</span>
                  </button>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-[#0B0813] p-3 rounded-xl border border-[#2E244A]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search classmate name or email..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#171226] border border-[#3A2D5C] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      statusFilter === 'all'
                        ? 'bg-[#F59E0B] text-black font-semibold'
                        : 'bg-[#171226] text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({totalCohortCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('delivered')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      statusFilter === 'delivered'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-[#171226] text-emerald-400 hover:bg-emerald-950/40'
                    }`}
                  >
                    Delivered ({deliveredCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      statusFilter === 'pending'
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'bg-[#171226] text-amber-400 hover:bg-amber-950/40'
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('unclaimed')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      statusFilter === 'unclaimed'
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'bg-[#171226] text-slate-400 hover:text-white'
                    }`}
                  >
                    Unclaimed ({unclaimedCount})
                  </button>
                </div>
              </div>

              {/* Roster & Delivery List */}
              <div className="space-y-2 max-h-[50dvh] overflow-y-auto pr-1">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No classmates found matching criteria.
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isExpanded = expandedMemberId === item.id;
                    const itemEmailKey = (item.hbsEmail || '').toLowerCase();
                    const isManualSent = !!manualSentMap[itemEmailKey];
                    const isExcludedFromSchedule = (scheduledInfo?.excludedEmails || []).some(
                      (e) => e.toLowerCase() === itemEmailKey
                    );
                    const isSendingThis = sendingIndividualEmail === itemEmailKey;

                    const memberEvents = recentEvents.filter((ev) => {
                      const evEmail = (ev.metadata?.email || '').toLowerCase();
                      const hbs = (item.hbsEmail || '').toLowerCase();
                      const rec = (item.recipientEmail || '').toLowerCase();
                      return (hbs && evEmail === hbs) || (rec && evEmail === rec);
                    });

                    return (
                      <div
                        key={item.id}
                        className={`bg-[#0B0813]/90 border rounded-xl transition-all overflow-hidden ${
                          isExpanded 
                            ? 'border-amber-500/60 shadow-lg shadow-purple-950/30' 
                            : 'border-[#2E244A] hover:border-[#3D305F]'
                        }`}
                      >
                        {/* Dense 1-Line Header Row (Tap to expand) */}
                        <div
                          onClick={() => setExpandedMemberId(isExpanded ? null : item.id)}
                          className="p-2 sm:p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none"
                        >
                          {/* Left: Avatar + Name + Email */}
                          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.fullName}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-purple-500/40 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-800 to-indigo-900 border border-purple-500/30 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shrink-0">
                                {item.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </div>
                            )}

                            <div className="min-w-0 flex-1 truncate">
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className="font-semibold text-xs sm:text-sm text-white truncate">
                                  {item.fullName}
                                </span>
                                {item.isClaimed && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Profile Claimed" />
                                )}
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                                {item.recipientEmail || item.hbsEmail}
                              </p>
                            </div>
                          </div>

                          {/* Right: Compact Delivery Pill + Individual Action + Chevron */}
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {item.welcomeEmailSentAt ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] sm:text-[11px] font-semibold">
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Delivered</span>
                              </span>
                            ) : isManualSent ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] sm:text-[11px] font-semibold" title="Individual invitation delivered & excluded from schedule">
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Invited</span>
                              </span>
                            ) : item.isClaimed ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] sm:text-[11px] font-semibold">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                <span>Pending</span>
                              </span>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                                  isExcludedFromSchedule
                                    ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {isExcludedFromSchedule ? 'Excluded' : 'Unclaimed'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendIndividualClaim(item);
                                  }}
                                  disabled={isSendingThis}
                                  className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Send invitation now via Google SMTP and exclude from scheduled campaign"
                                >
                                  {isSendingThis ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-300" />
                                  ) : (
                                    <Send className="w-2.5 h-2.5 text-amber-300" />
                                  )}
                                  <span className="hidden sm:inline">Send Now</span>
                                </button>
                              </div>
                            )}

                            <div className="text-slate-400 hover:text-white p-0.5 transition-transform">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Inline Inspection Drawer */}
                        {isExpanded && (
                          <div className="p-3 bg-[#130E22] border-t border-[#231A38] space-y-2.5 text-xs animate-in fade-in duration-150">
                            {/* Identity & Delivery Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2.5 rounded-lg bg-[#0B0813] border border-[#2E244A] space-y-1">
                                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                                  <span>Account Identity</span>
                                  <span className={item.isClaimed ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                    {item.isClaimed ? '✓ Claimed' : '⚪ Unclaimed'}
                                  </span>
                                </div>
                                <div className="truncate">
                                  <span className="text-slate-500">Official HBS: </span>
                                  <code className="text-white select-all">{item.hbsEmail}</code>
                                </div>
                                {item.recipientEmail && item.recipientEmail.toLowerCase() !== item.hbsEmail.toLowerCase() && (
                                  <div className="truncate">
                                    <span className="text-slate-500">Linked Gmail: </span>
                                    <code className="text-amber-300 select-all">{item.recipientEmail}</code>
                                  </div>
                                )}
                                {item.profile?.phone && (
                                  <div>
                                    <span className="text-slate-500">Phone: </span>
                                    <span className="text-slate-300">{item.profile.phone}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-slate-500">Photo: </span>
                                  <span className={item.photoUrl ? 'text-emerald-400' : 'text-amber-300'}>
                                    {item.photoUrl ? '✓ High-Res Uploaded' : '⚪ Photo Pending'}
                                  </span>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-[#0B0813] border border-[#2E244A] space-y-1 flex flex-col justify-between">
                                <div>
                                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                                    Delivery Status
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Dispatched: </span>
                                    <span className="text-slate-200">
                                      {item.welcomeEmailSentAt
                                        ? formatDeliveryTime(item.welcomeEmailSentAt)
                                        : isManualSent && manualSentMap[itemEmailKey]
                                        ? `Invited ${formatDeliveryTime(manualSentMap[itemEmailKey].sentAt)}`
                                        : 'Not dispatched yet'}
                                    </span>
                                  </div>
                                  {(item.welcomeEmailMessageId || (isManualSent && manualSentMap[itemEmailKey]?.messageId)) && (
                                    <div className="flex items-center space-x-1 pt-0.5">
                                      <span className="text-slate-500">Msg ID: </span>
                                      <span 
                                        className="font-mono text-[9px] text-slate-400 truncate max-w-[130px]" 
                                        title={item.welcomeEmailMessageId || manualSentMap[itemEmailKey]?.messageId}
                                      >
                                        {item.welcomeEmailMessageId || manualSentMap[itemEmailKey]?.messageId}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyMessageId((item.welcomeEmailMessageId || manualSentMap[itemEmailKey]?.messageId)!);
                                        }}
                                        title="Copy Message ID"
                                        className="hover:text-amber-300 text-slate-400 cursor-pointer p-0.5"
                                      >
                                        {copiedMsgId === (item.welcomeEmailMessageId || manualSentMap[itemEmailKey]?.messageId) ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {item.isClaimed && item.profile ? (
                                  <div className="pt-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResendWelcome(item);
                                      }}
                                      disabled={resendingUid === item.uid}
                                      className="w-full py-1.5 px-3 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow disabled:opacity-50 cursor-pointer transition-all"
                                    >
                                      {resendingUid === item.uid ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <SendHorizontal className="w-3 h-3 text-amber-300" />
                                      )}
                                      <span>{item.welcomeEmailSentAt ? 'Resend Welcome Email' : 'Send Welcome Email Now'}</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="pt-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendIndividualClaim(item);
                                      }}
                                      disabled={isSendingThis}
                                      className={`w-full py-1.5 px-3 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow disabled:opacity-50 cursor-pointer transition-all ${
                                        isManualSent
                                          ? 'bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white'
                                          : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white'
                                      }`}
                                    >
                                      {isSendingThis ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : isManualSent ? (
                                        <Check className="w-3 h-3 text-emerald-300" />
                                      ) : (
                                        <Send className="w-3 h-3 text-white" />
                                      )}
                                      <span>
                                        {isManualSent ? 'Resend Claim Invitation' : 'Send Claim Invitation Outside Schedule'}
                                      </span>
                                    </button>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-0.5">
                                      <span>
                                        {isExcludedFromSchedule || isManualSent ? '🛡️ Excluded from scheduled drip' : '⏳ In 8:00 AM scheduled queue'}
                                      </span>
                                      {isManualSent && manualSentMap[itemEmailKey] && (
                                        <span className="text-emerald-400 font-medium">
                                          Sent {new Date(manualSentMap[itemEmailKey].sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Classmate Specific Telemetry Activity */}
                            {memberEvents.length > 0 && (
                              <div className="p-2.5 bg-[#0B0813] border border-purple-500/30 rounded-lg space-y-1.5">
                                <div className="text-[10px] text-purple-300 font-semibold flex items-center justify-between">
                                  <span>Activity Logs for this Classmate ({memberEvents.length})</span>
                                  <span className="text-emerald-400 text-[9px] font-mono">Live Telemetry</span>
                                </div>
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                  {memberEvents.map((ev) => (
                                    <div key={ev.id} className="text-[10px] text-slate-300 flex items-center justify-between py-0.5 border-b border-slate-900/60 last:border-0">
                                      <span className="font-medium text-amber-300">
                                        {ev.eventType.replace(/_/g, ' ')}
                                      </span>
                                      <span className="text-slate-500 font-mono text-[9px]">
                                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COHORT ANALYTICS & TELEMETRY */}
          {activeTab === 'analytics' && (
            <div className="space-y-5">
              {/* Telemetry Summary Banner */}
              <div className="p-3.5 bg-gradient-to-r from-[#211738] to-[#160F26] border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Activity className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Live App & Email Interaction Telemetry</h4>
                    <p className="text-[11px] text-slate-400">
                      Real-time analytics for email clicks, login funnels, guest drop-offs, and feature engagement
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    ● Real-Time Firestore Sync
                  </span>
                </div>
              </div>

              {/* 4 Core KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* 1. Email Link Clicks */}
                <div className="p-2.5 sm:p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl relative overflow-hidden">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between mb-0.5 sm:mb-1">
                    <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                      <MousePointerClick className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Email Clicks</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-amber-300 font-semibold">{deliveredCount > 0 ? ((analyticsSummary.emailClicks / deliveredCount) * 100).toFixed(0) : 0}% CTR</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-white">{analyticsSummary.emailClicks}</div>
                  <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                    From {deliveredCount} delivered emails
                  </div>
                </div>

                {/* 2. Logins Completed */}
                <div className="p-2.5 sm:p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between mb-0.5 sm:mb-1">
                    <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                      <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">Logins Done</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-emerald-300 font-semibold">
                      {analyticsSummary.loginStarted > 0 ? Math.round((analyticsSummary.loginCompleted / analyticsSummary.loginStarted) * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-white">
                    {analyticsSummary.loginCompleted}
                    <span className="text-[10px] sm:text-xs text-slate-500 font-normal ml-1">/ {analyticsSummary.loginStarted}</span>
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-emerald-400/90 mt-0.5 truncate">
                    {totalCohortCount - unclaimedCount} profiles claimed
                  </div>
                </div>

                {/* 3. Logins Failed / Issues */}
                <div className="p-2.5 sm:p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between mb-0.5 sm:mb-1">
                    <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                      <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">Login Errors</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-rose-300 font-semibold">
                      {analyticsSummary.loginStarted > 0 ? Math.round((analyticsSummary.loginFailed / analyticsSummary.loginStarted) * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-rose-400">{analyticsSummary.loginFailed}</div>
                  <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                    {Object.keys(analyticsSummary.loginErrors || {}).length} distinct error types
                  </div>
                </div>

                {/* 4. Guest Mode Visits */}
                <div className="p-2.5 sm:p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between mb-0.5 sm:mb-1">
                    <span className="flex items-center space-x-1 sm:space-x-1.5 truncate">
                      <UserX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">Guest Mode</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-purple-300 font-semibold">
                      {analyticsSummary.guestModeEntered > 0 ? Math.round((analyticsSummary.guestModeConverted / analyticsSummary.guestModeEntered) * 100) : 0}% conv.
                    </span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-white">{analyticsSummary.guestModeEntered}</div>
                  <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                    {analyticsSummary.guestModeConverted} converted to account
                  </div>
                </div>
              </div>

              {/* Authentication & Sign-In Funnel Analysis */}
              <div className="p-3 sm:p-4 bg-[#0B0813]/70 border border-[#2E244A] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs sm:text-sm text-white flex items-center space-x-2">
                    <LogIn className="w-4 h-4 text-emerald-400" />
                    <span>Authentication Funnel Analysis</span>
                  </h4>
                  <span className="text-[10px] sm:text-[11px] text-slate-400">
                    Total Attempts: <strong className="text-white">{analyticsSummary.loginStarted}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 text-xs">
                  {/* Completed */}
                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-emerald-300 font-medium text-[11px] sm:text-xs">1. Completed Login</span>
                      <span className="text-emerald-400 font-bold">
                        {analyticsSummary.loginStarted > 0 ? Math.round((analyticsSummary.loginCompleted / analyticsSummary.loginStarted) * 100) : 0}%
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-white">{analyticsSummary.loginCompleted}</div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Successfully signed in & unlocked Section F</p>
                  </div>

                  {/* Abandoned / Dropped out */}
                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-amber-500/30 rounded-lg">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-amber-300 font-medium text-[11px] sm:text-xs">2. Started & Left</span>
                      <span className="text-amber-400 font-bold">
                        {analyticsSummary.loginStarted > 0 ? Math.round(((analyticsSummary.loginAbandoned || Math.max(0, analyticsSummary.loginStarted - analyticsSummary.loginCompleted - analyticsSummary.loginFailed)) / analyticsSummary.loginStarted) * 100) : 0}%
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-white">
                      {analyticsSummary.loginAbandoned || Math.max(0, analyticsSummary.loginStarted - analyticsSummary.loginCompleted - analyticsSummary.loginFailed)}
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Closed prompt or navigated away before submitting</p>
                  </div>

                  {/* Encountered Errors */}
                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-rose-500/30 rounded-lg">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-rose-300 font-medium text-[11px] sm:text-xs">3. Encountered Issues</span>
                      <span className="text-rose-400 font-bold">
                        {analyticsSummary.loginStarted > 0 ? Math.round((analyticsSummary.loginFailed / analyticsSummary.loginStarted) * 100) : 0}%
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-rose-300">{analyticsSummary.loginFailed}</div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Auth rejected due to credentials or wrong email</p>
                  </div>
                </div>

                {/* Specific Login Errors Breakdown Table (Click to Drill-Down) */}
                <div className="mt-3 pt-3 border-t border-[#231A38]">
                  <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Breakdown of Issues Encountered by Classmates</span>
                    <span className="text-[10px] text-amber-300/80">Tap an error to filter who was affected</span>
                  </div>

                  {Object.keys(analyticsSummary.loginErrors || {}).length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>No login errors have been encountered yet. Sign-in pipeline is functioning cleanly.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {Object.entries(analyticsSummary.loginErrors || {}).map(([errCode, count]) => {
                        let label = errCode;
                        let hint = 'Authentication error';
                        if (errCode === 'invalid_section_f_email') {
                          label = 'Unrecognized Email (Non-Section F)';
                          hint = 'Entered email that is not in Section F roster or authorized list';
                        } else if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
                          label = 'Incorrect Password';
                          hint = 'Password entered did not match user account';
                        } else if (errCode === 'auth/popup-closed-by-user') {
                          label = 'Google Popup Closed Early';
                          hint = 'User closed the Gmail sign-in window before consenting';
                        } else if (errCode === 'auth/user-not-found') {
                          label = 'Account Not Found';
                          hint = 'Email not registered with password yet; auto-routed to registration';
                        } else if (errCode === 'auth/email-already-in-use') {
                          label = 'Email Already Registered';
                          hint = 'Tried to create account with email that already has an account';
                        } else if (errCode === 'auth/too-many-requests') {
                          label = 'Temporary Rate Limit';
                          hint = 'Too many attempts in short succession';
                        }

                        const isSelected = selectedErrorCode === errCode;

                        return (
                          <div
                            key={errCode}
                            onClick={() => setSelectedErrorCode(isSelected ? null : errCode)}
                            className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-rose-950/70 border-rose-500 ring-1 ring-rose-500/40 shadow-md'
                                : 'bg-[#120D1F] border-rose-950/60 hover:border-rose-700/60'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-semibold text-rose-300 flex items-center space-x-1.5 truncate">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span className="truncate">{label}</span>
                                <code className="text-[10px] text-slate-500 ml-1 hidden sm:inline">({errCode})</code>
                              </span>
                              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">{hint}</span>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[10px] text-amber-300 underline hidden sm:inline">
                                {isSelected ? 'Filter Active ✕' : 'Filter Feed →'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs">
                                {count} {count === 1 ? 'incident' : 'incidents'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Guest Mode Behavior & Conversion */}
              <div className="p-3 sm:p-4 bg-[#0B0813]/70 border border-[#2E244A] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs sm:text-sm text-white flex items-center space-x-2">
                    <UserX className="w-4 h-4 text-purple-400" />
                    <span>Guest Mode & Casual Visitors</span>
                  </h4>
                  <span className="text-[10px] sm:text-[11px] text-purple-300 font-semibold">
                    {analyticsSummary.guestModeEntered > 0
                      ? Math.round((analyticsSummary.guestModeConverted / analyticsSummary.guestModeEntered) * 100)
                      : 0}% Claim Conversion
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 text-xs">
                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-[#2E244A] rounded-lg">
                    <div className="text-slate-400 mb-0.5 text-[10px] sm:text-[11px]">Total Guest Check-ins</div>
                    <div className="text-base sm:text-lg font-bold text-white">{analyticsSummary.guestModeEntered}</div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Tapped "Try Section F Guest Access"</p>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-emerald-500/30 rounded-lg">
                    <div className="text-emerald-300 mb-0.5 text-[10px] sm:text-[11px] font-medium">Converted to Profile</div>
                    <div className="text-base sm:text-lg font-bold text-emerald-300">{analyticsSummary.guestModeConverted}</div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Explored as guest then created/claimed account</p>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-slate-700/50 rounded-lg">
                    <div className="text-slate-400 mb-0.5 text-[10px] sm:text-[11px]">Bounced / Casual Only</div>
                    <div className="text-base sm:text-lg font-bold text-slate-300">
                      {Math.max(0, analyticsSummary.guestModeEntered - analyticsSummary.guestModeConverted)}
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Checked in guest mode and did not continue to register</p>
                  </div>
                </div>
              </div>

              {/* App Features Engagement (Coffee Chat, Deck, Atlas, Spotlight) */}
              <div className="p-3 sm:p-4 bg-[#0B0813]/70 border border-[#2E244A] rounded-xl space-y-3">
                <h4 className="font-semibold text-xs sm:text-sm text-white flex items-center space-x-2">
                  <Coffee className="w-4 h-4 text-[#F59E0B]" />
                  <span>Feature & App Engagement</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 text-xs">
                  {/* Coffee Chat Views */}
                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-amber-500/20 rounded-lg">
                    <div className="flex items-center space-x-1.5 text-amber-400 text-[10px] sm:text-[11px] font-medium mb-1 truncate">
                      <Coffee className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Coffee Chats</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white">{analyticsSummary.coffeeChatsViewed}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">
                      {analyticsSummary.coffeeInvitesSent} invites sent
                    </div>
                  </div>

                  {/* Cohort Deck */}
                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-purple-500/20 rounded-lg">
                    <div className="flex items-center space-x-1.5 text-purple-400 text-[10px] sm:text-[11px] font-medium mb-1 truncate">
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Card Deck</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white">{analyticsSummary.deckViewed}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Cards browsed</div>
                  </div>

                  {/* Atlas / Infographics */}
                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-cyan-500/20 rounded-lg">
                    <div className="flex items-center space-x-1.5 text-cyan-400 text-[10px] sm:text-[11px] font-medium mb-1 truncate">
                      <Compass className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Cohort Atlas</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white">{analyticsSummary.atlasViewed}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Demographics views</div>
                  </div>

                  {/* Daily Spotlight */}
                  <div className="p-2.5 sm:p-3 bg-[#130E20] border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center space-x-1.5 text-yellow-400 text-[10px] sm:text-[11px] font-medium mb-1 truncate">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Spotlight</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white">{analyticsSummary.spotlightViewed}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Featured highlights</div>
                  </div>
                </div>
              </div>

              {/* Real-time Live Interaction Activity Feed with Filter Chips & Student Identification */}
              <div className="p-3 sm:p-4 bg-[#0B0813]/70 border border-[#2E244A] rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h4 className="font-semibold text-xs sm:text-sm text-white">Real-Time Interaction Feed</h4>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                      {filteredEvents.length} events
                    </span>
                  </div>

                  {/* Filter Chip Strip */}
                  <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar whitespace-nowrap text-[10px]">
                    <button
                      onClick={() => {
                        setAnalyticsFeedFilter('all');
                        setSelectedErrorCode(null);
                      }}
                      className={`px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                        analyticsFeedFilter === 'all' && !selectedErrorCode
                          ? 'bg-amber-500 text-black font-bold'
                          : 'bg-[#1C152B] text-slate-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setAnalyticsFeedFilter('errors');
                        setSelectedErrorCode(null);
                      }}
                      className={`px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                        analyticsFeedFilter === 'errors'
                          ? 'bg-rose-600 text-white font-bold'
                          : 'bg-[#1C152B] text-rose-300 hover:bg-rose-950/40'
                      }`}
                    >
                      Errors ({recentEvents.filter((e) => e.eventType === 'login_failed').length})
                    </button>
                    <button
                      onClick={() => {
                        setAnalyticsFeedFilter('logins');
                        setSelectedErrorCode(null);
                      }}
                      className={`px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                        analyticsFeedFilter === 'logins'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-[#1C152B] text-emerald-300 hover:bg-emerald-950/40'
                      }`}
                    >
                      Logins ({recentEvents.filter((e) => e.eventType.startsWith('login_')).length})
                    </button>
                    <button
                      onClick={() => {
                        setAnalyticsFeedFilter('clicks');
                        setSelectedErrorCode(null);
                      }}
                      className={`px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                        analyticsFeedFilter === 'clicks'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-[#1C152B] text-amber-300 hover:bg-amber-950/40'
                      }`}
                    >
                      Clicks ({recentEvents.filter((e) => e.eventType === 'email_link_clicked').length})
                    </button>
                    <button
                      onClick={() => {
                        setAnalyticsFeedFilter('coffee');
                        setSelectedErrorCode(null);
                      }}
                      className={`px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                        analyticsFeedFilter === 'coffee'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-[#1C152B] text-amber-300 hover:bg-amber-950/40'
                      }`}
                    >
                      Coffee ({recentEvents.filter((e) => e.eventType.includes('coffee')).length})
                    </button>
                  </div>
                </div>

                {/* Active Error Code Filter Banner */}
                {selectedErrorCode && (
                  <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-500/40 flex items-center justify-between text-xs text-rose-200">
                    <div className="flex items-center space-x-1.5 truncate">
                      <Filter className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">
                        Filtering affected classmates for error: <code className="text-amber-300 font-bold">{selectedErrorCode}</code>
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedErrorCode(null)}
                      className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-white text-[10px] font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      Clear Filter ✕
                    </button>
                  </div>
                )}

                {filteredEvents.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-500">
                    No matching telemetry events recorded yet.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {filteredEvents.map((ev) => {
                      let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                      let label = ev.eventType.replace(/_/g, ' ');

                      if (ev.eventType === 'email_link_clicked') {
                        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                        label = 'Email Click';
                      } else if (ev.eventType === 'login_completed') {
                        badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                        label = 'Login Done';
                      } else if (ev.eventType === 'login_failed') {
                        badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                        label = 'Login Failed';
                      } else if (ev.eventType === 'login_started') {
                        badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                        label = 'Login Start';
                      } else if (ev.eventType === 'login_abandoned') {
                        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                        label = 'Login Left';
                      } else if (ev.eventType === 'guest_mode_entered') {
                        badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
                        label = 'Guest Mode';
                      } else if (ev.eventType === 'guest_mode_converted') {
                        badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                        label = 'Guest Converted';
                      } else if (ev.eventType === 'view_coffee_chat') {
                        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                        label = 'Coffee Chats';
                      } else if (ev.eventType === 'create_coffee_invite') {
                        badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                        label = 'Coffee Invite';
                      }

                      // Identify classmate if email is present
                      const email = ev.metadata?.email;
                      const recognizedMember = email ? findSectionFMember(email) : null;

                      const timeStr = (() => {
                        try {
                          return new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        } catch {
                          return ev.timestamp;
                        }
                      })();

                      return (
                        <div
                          key={ev.id}
                          className="p-2 sm:p-2.5 bg-[#120D1F] border border-[#231A38] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs hover:border-[#3A2D5C] transition-colors"
                        >
                          <div className="flex items-center space-x-2 truncate min-w-0">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider shrink-0 ${badgeColor}`}>
                              {label}
                            </span>
                            
                            {/* Classmate Identification */}
                            <div className="truncate text-slate-300 text-[11px] sm:text-xs">
                              {recognizedMember ? (
                                <span className="font-semibold text-white">
                                  {recognizedMember.displayName}{' '}
                                  <span className="text-[10px] text-amber-300 font-mono">({email})</span>
                                </span>
                              ) : email ? (
                                <code className="text-amber-300 font-mono text-[11px]">{email}</code>
                              ) : ev.metadata?.method ? (
                                <span>via <strong className="text-slate-200 capitalize">{ev.metadata.method}</strong></span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[10px]">{ev.sessionId || 'Visitor Interaction'}</span>
                              )}

                              {ev.metadata?.errorCode && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-mono">
                                  {ev.metadata.errorCode}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-[9px] sm:text-[10px] text-slate-500 shrink-0 font-mono self-end sm:self-auto">
                            {timeStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DATABASE & INCIDENT TOOLS (COMPACT OPERATIONS MATRIX) */}
          {activeTab === 'database' && (
            <div className="space-y-3.5">
              {/* System State Micro-Stat Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 sm:p-2.5 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1 truncate mb-0.5">
                    <ShieldCheck className="w-3 h-3 text-[#F59E0B] shrink-0" />
                    <span className="truncate">authorized_members</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white flex items-center space-x-1.5">
                    <span>{SECTION_F_ROSTER.length}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Roster Verified" />
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">HBS @mba2028 verified</div>
                </div>

                <div className="p-2 sm:p-2.5 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1 truncate mb-0.5">
                    <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">unclaimed_cards</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white flex items-center space-x-1.5">
                    <span>{unclaimedCards.length}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="text-[9px] text-emerald-400 truncate">{unclaimedCount} ready to claim</div>
                </div>

                <div className="p-2 sm:p-2.5 bg-[#0B0813] border border-[#2E244A] rounded-xl">
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1 truncate mb-0.5">
                    <Users className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="truncate">profiles (Live)</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white flex items-center space-x-1.5">
                    <span>{profiles.length}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">Active deck cards</div>
                </div>
              </div>

              {/* SECTION A: SMS INCIDENT ALERTS & MOBILE NOTIFICATIONS */}
              <div className="p-3 sm:p-3.5 bg-[#0B0813]/80 border border-amber-500/30 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-white">SMS Incident Alerts & Mobile Notifications</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Auto-Dispatch · From: Section F
                  </span>
                </div>

                {/* Mobile Configuration Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 font-medium">Admin Mobile Phone Number</label>
                    <span className="text-[9px] text-slate-500">Auto-dispatches to all major US cellular networks</span>
                  </div>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => handleSavePhone(e.target.value)}
                      placeholder="e.g. 617-555-0199"
                      className="w-full pl-8 pr-2.5 py-1.5 bg-[#171226] border border-[#3A2D5C] rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>
                </div>

                {/* Auto Alert Toggle & Test Dispatch Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#1C152E]">
                  <label className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={smsAutoAlert}
                      onChange={(e) => handleToggleSmsAutoAlert(e.target.checked)}
                      className="rounded border-[#3A2D5C] bg-[#171226] text-[#F59E0B] focus:ring-0 cursor-pointer"
                    />
                    <span>Auto-send SMS when a classmate encounters login failure</span>
                  </label>

                  <button
                    onClick={handleSendTestSms}
                    disabled={smsLoading || !adminPhone}
                    className="py-1.5 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow disabled:opacity-50 cursor-pointer transition-all shrink-0"
                  >
                    {smsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-black" />}
                    <span>Send Test SMS to My Phone</span>
                  </button>
                </div>

                {/* SMS Feedback banner */}
                {smsStatus && (
                  <div
                    className={`p-2 rounded-lg text-[11px] flex items-center space-x-2 border ${
                      smsStatus.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
                    }`}
                  >
                    {smsStatus.type === 'success' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="flex-1">{smsStatus.text}</span>
                  </div>
                )}
              </div>

              {/* SECTION B: COMPACT DATABASE & DIRECTORY OPERATIONS */}
              <div className="p-3 sm:p-3.5 bg-[#0B0813]/80 border border-[#2E244A] rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  <span>Database & Directory Operations</span>
                </div>

                {/* Action 1: Sync Authorized Roster */}
                <div className="p-2 sm:p-2.5 bg-[#120D1F] border border-[#231A38] rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Sync Authorized Roster</div>
                      <div className="text-[10px] text-slate-400 truncate">Store {SECTION_F_ROSTER.length} official @mba2028 emails in Firestore</div>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncRoster}
                    disabled={loading}
                    className="px-2.5 sm:px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white font-medium rounded-lg text-xs flex items-center space-x-1 cursor-pointer transition-all disabled:opacity-50 shrink-0"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    <span>Sync Roster</span>
                  </button>
                </div>

                {/* Action 2: Batch Seed Default Directory */}
                <div className="p-2 sm:p-2.5 bg-[#120D1F] border border-[#231A38] rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Seed Unclaimed Cards</div>
                      <div className="text-[10px] text-slate-400 truncate">Populate demo classmates from seed_cards.json</div>
                    </div>
                  </div>
                  <button
                    onClick={handleSeedDefaultCards}
                    disabled={loading}
                    className="px-2.5 sm:px-3 py-1 bg-[#F59E0B] hover:bg-amber-400 text-black font-semibold rounded-lg text-xs flex items-center space-x-1 cursor-pointer transition-all disabled:opacity-50 shrink-0"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    <span>Seed Cards</span>
                  </button>
                </div>

                {/* Action 3: Seed Live Profiles Deck */}
                <div className="p-2 sm:p-2.5 bg-[#120D1F] border border-[#231A38] rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Seed Live Profiles Deck</div>
                      <div className="text-[10px] text-slate-400 truncate">Directly write 32 cards to live `profiles` collection</div>
                    </div>
                  </div>
                  <button
                    onClick={handleSeedLiveProfiles}
                    disabled={loading}
                    className="px-2.5 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs flex items-center space-x-1 cursor-pointer transition-all disabled:opacity-50 shrink-0"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    <span>Seed Deck</span>
                  </button>
                </div>

                {/* Action 4: Upload Custom JSON */}
                <div className="p-2 sm:p-2.5 bg-[#120D1F] border border-[#231A38] rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <Upload className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Import Custom Cards JSON</div>
                      <div className="text-[10px] text-slate-400 truncate">Batch-write any local JSON array into Firestore</div>
                    </div>
                  </div>
                  <label className="px-2.5 sm:px-3 py-1 bg-[#231A38] hover:bg-[#2D2147] border border-[#3A2D5C] text-slate-200 font-medium rounded-lg text-xs flex items-center space-x-1 cursor-pointer transition-all shrink-0">
                    {customFileLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    <span>Browse JSON</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      disabled={customFileLoading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* SECTION C: EMAIL DIAGNOSTICS (GMAIL SMTP) */}
              <div className="p-3 sm:p-3.5 bg-[#0B0813]/80 border border-purple-500/30 rounded-xl space-y-2.5">
                {/* Line 1: Service title and active status on one clean line */}
                <div className="flex items-center justify-between border-b border-[#231A38] pb-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-white tracking-wide">Transactional Gmail SMTP</span>
                  </div>
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Engine</span>
                  </span>
                </div>

                {/* Line 2: Dedicated Email Section placed cleanly under it */}
                <div className="p-2 sm:p-2.5 bg-[#120D1F] border border-[#231A38] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sender Email Account</span>
                    <code className="text-amber-300 font-mono text-[11px] bg-[#171226] px-2 py-0.5 rounded border border-[#3A2D5C]">
                      your-sending-account@gmail.com
                    </code>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
                    Dispatches official 30-second profile claim invitations, welcome cards, and administrative telemetry mirrors.
                  </p>
                </div>

                {/* Line 3: Actions row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] text-slate-500">
                    Verify deliverability by dispatching a test email directly to admin inbox.
                  </span>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={handleSendTestEmail}
                      disabled={emailLoading}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow disabled:opacity-50 cursor-pointer transition-all"
                    >
                      {emailLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-amber-300" />}
                      <span>Send Test to Laurie</span>
                    </button>
                    <a
                      href="/welcome_email_preview.html"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 sm:px-3 py-1.5 bg-[#231A38] hover:bg-[#2D2147] border border-[#3A2D5C] text-slate-200 font-medium rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer transition-all text-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      <span>HTML Preview</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMAIL STUDIO & HTML COMPOSER */}
          {activeTab === 'composer' && (
            <div className="p-3 sm:p-5 space-y-4">
              {/* Studio Header & Template Selector */}
              <div className="p-3 sm:p-4 bg-gradient-to-r from-[#1E1436] to-[#120D22] border border-purple-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                    <PenTool className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                      <span>Section F Email Studio</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                        Live HTML
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Draft, customize templates, preview real-time responsive rendering, and dispatch directly.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Template:</span>
                  {(['claim', 'welcome', 'coffee', 'custom'] as EmailTemplatePresetId[]).map((tId) => (
                    <button
                      key={tId}
                      onClick={() => handleApplyTemplate(tId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        composerTemplate === tId
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-[#231A38] text-slate-300 hover:bg-[#2F234D]'
                      }`}
                    >
                      {EMAIL_PRESETS[tId].label}
                    </button>
                  ))}
                  <button
                    onClick={handleResetToTemplate}
                    title="Reset to Template Defaults"
                    className="p-1.5 rounded-lg bg-[#231A38] hover:bg-[#2F234D] text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {composerStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start space-x-2.5 ${
                    composerStatus.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
                  }`}
                >
                  {composerStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p>{composerStatus.text}</p>
                    {composerStatus.messageId && (
                      <p className="text-[10px] font-mono text-emerald-400/80 mt-0.5">
                        ID: {composerStatus.messageId}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setComposerStatus(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Mobile View Toggle */}
              <div className="flex sm:hidden p-1 bg-[#0E091D] border border-[#2E244A] rounded-xl">
                <button
                  onClick={() => setComposerMobileView('editor')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    composerMobileView === 'editor'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Edit Draft</span>
                </button>
                <button
                  onClick={() => setComposerMobileView('preview')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    composerMobileView === 'preview'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                </button>
              </div>

              {/* Split Workspace: Left Editor / Right Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* COLUMN 1: DRAFT EDITOR */}
                <div className={`lg:col-span-6 space-y-3.5 ${composerMobileView === 'preview' ? 'hidden sm:block' : 'block'}`}>
                  {/* Recipient Target Card */}
                  <div className="p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Target Recipient</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        From: "Section F" &lt;your-sending-account@gmail.com&gt;
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setComposerTargetType('admin')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center truncate ${
                          composerTargetType === 'admin'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                            : 'bg-[#150F25] border-[#2E244A] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Laurie (Admin)
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerTargetType('classmate')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center truncate ${
                          composerTargetType === 'classmate'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                            : 'bg-[#150F25] border-[#2E244A] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Select Classmate
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerTargetType('custom')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center truncate ${
                          composerTargetType === 'custom'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                            : 'bg-[#150F25] border-[#2E244A] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Custom Email
                      </button>
                    </div>

                    {composerTargetType === 'classmate' && (
                      <div className="pt-1">
                        <select
                          value={composerSelectedClassmateId}
                          onChange={(e) => setComposerSelectedClassmateId(e.target.value)}
                          className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                        >
                          {cohortItems.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fullName} — {m.hbsEmail || m.recipientEmail} {m.isClaimed ? '(Claimed)' : '(Unclaimed)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {composerTargetType === 'custom' && (
                      <div className="pt-1">
                        <input
                          type="email"
                          placeholder="e.g. classmate@mba2028.hbs.edu or personal@gmail.com"
                          value={composerCustomTo}
                          onChange={(e) => setComposerCustomTo(e.target.value)}
                          className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    )}

                    <div className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center justify-between">
                      <span className="truncate">Active Delivery: <strong>{resolvedRecipient.description}</strong></span>
                      <span className="text-[9px] text-slate-400 shrink-0 ml-2">Tokens: {'{{name}}'}</span>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={composerSubject}
                      onChange={(e) => setComposerSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* Badge & Title */}
                  <div className="p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                          Badge (Preheader)
                        </label>
                        <input
                          type="text"
                          value={composerBadge}
                          onChange={(e) => setComposerBadge(e.target.value)}
                          placeholder="e.g. ACTION REQUESTED"
                          className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                          Greeting
                        </label>
                        <input
                          type="text"
                          value={composerGreeting}
                          onChange={(e) => setComposerGreeting(e.target.value)}
                          placeholder="e.g. Hi {{name}},"
                          className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                        Headline / Title
                      </label>
                      <input
                        type="text"
                        value={composerTitle}
                        onChange={(e) => setComposerTitle(e.target.value)}
                        placeholder="Main card title..."
                        className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Body Paragraphs */}
                  <div className="p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                        Message Paragraphs
                      </label>
                      <span className="text-[10px] text-slate-500">Blank line = new paragraph</span>
                    </div>
                    <textarea
                      rows={4}
                      value={composerBodyText}
                      onChange={(e) => setComposerBodyText(e.target.value)}
                      placeholder="Write your email body text here..."
                      className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-400 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Bullet Highlights */}
                  <div className="p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                        Feature Bullet Highlights
                      </label>
                      <span className="text-[10px] text-slate-500">One bullet per line</span>
                    </div>
                    <textarea
                      rows={3}
                      value={composerBulletsText}
                      onChange={(e) => setComposerBulletsText(e.target.value)}
                      placeholder="Bullet 1&#10;Bullet 2&#10;Bullet 3"
                      className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-400 leading-relaxed font-sans"
                    />
                  </div>

                  {/* CTA Button & Link */}
                  <div className="p-3 bg-[#0B0813] border border-[#2E244A] rounded-xl space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={composerButtonText}
                          onChange={(e) => setComposerButtonText(e.target.value)}
                          placeholder="e.g. CLAIM PROFILE"
                          className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                          Button URL
                        </label>
                        <input
                          type="url"
                          value={composerButtonUrl}
                          onChange={(e) => setComposerButtonUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-1.5 text-xs text-purple-300 focus:outline-none focus:border-purple-400 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Footer Note
                      </label>
                      <input
                        type="text"
                        value={composerFooterText}
                        onChange={(e) => setComposerFooterText(e.target.value)}
                        placeholder="Footer copyright / notice..."
                        className="w-full bg-[#171226] border border-[#3A2D5C] rounded-lg px-2.5 py-1.5 text-[11px] text-slate-400 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Action Dispatch Bar */}
                  <div className="p-3 bg-gradient-to-r from-[#171226] to-[#0E091D] border border-purple-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow">
                    <button
                      type="button"
                      onClick={() => handleSendDraftEmail('admin@example.com', 'Admin')}
                      disabled={composerSending}
                      className="w-full sm:w-auto px-3.5 py-2 bg-[#231A38] hover:bg-[#2D2147] border border-purple-500/40 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {composerSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-amber-400" />}
                      <span>Send Test to Laurie</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowComposerConfirmModal(true)}
                      disabled={composerSending || !resolvedRecipient.email}
                      className="w-full sm:flex-1 py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
                    >
                      {composerSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Dispatch Email ({resolvedRecipient.name})</span>
                    </button>
                  </div>
                </div>

                {/* COLUMN 2: LIVE HTML PREVIEW (DESKTOP + MOBILE SANDBOX) */}
                <div className={`lg:col-span-6 space-y-2 ${composerMobileView === 'editor' ? 'hidden sm:block' : 'block'}`}>
                  {/* Preview Toolbar */}
                  <div className="p-2.5 bg-[#0B0813] border border-[#2E244A] rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-semibold text-white">Live Email Preview</span>
                      <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">Sandboxed Iframe</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setComposerDeviceWidth('desktop')}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-all ${
                          composerDeviceWidth === 'desktop'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-[#171226] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Monitor className="w-3 h-3" />
                        <span>Desktop (580px)</span>
                      </button>
                      <button
                        onClick={() => setComposerDeviceWidth('mobile')}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-all ${
                          composerDeviceWidth === 'mobile'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-[#171226] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Mobile (375px)</span>
                      </button>
                    </div>
                  </div>

                  {/* Sandboxed Iframe Container */}
                  <div className="p-3 bg-[#07050C] border border-[#231A38] rounded-2xl flex justify-center items-start min-h-[540px] max-h-[640px] overflow-auto">
                    <div
                      className={`transition-all duration-200 bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-700 ${
                        composerDeviceWidth === 'mobile' ? 'w-[375px]' : 'w-full max-w-[580px]'
                      }`}
                      style={{ height: '580px' }}
                    >
                      <iframe
                        srcDoc={previewHtml}
                        title="Section F Email Preview"
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0B0813] border-t border-[#2E244A] flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {activeTab === 'tracker' 
              ? `${filteredItems.length} members shown` 
              : activeTab === 'analytics'
              ? `Telemetry updated: ${analyticsSummary.lastUpdated ? new Date(analyticsSummary.lastUpdated).toLocaleTimeString() : 'Live sync active'}`
              : activeTab === 'composer'
              ? `Draft auto-saved · Ready to dispatch via Transactional Gmail SMTP`
              : 'Firestore Cloud Sync Active'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Email Studio Dispatch */}
      {showComposerConfirmModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#171226] border border-purple-500/50 rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <Send className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Confirm Email Dispatch</h4>
                <p className="text-xs text-slate-400">Transactional Section F Gmail Delivery</p>
              </div>
            </div>

            <div className="p-3 bg-[#0B0813] rounded-xl border border-[#2E244A] text-xs space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-[#231A38]">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-semibold text-white truncate max-w-[220px]">
                  {resolvedRecipient.name} &lt;{resolvedRecipient.email}&gt;
                </span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#231A38]">
                <span className="text-slate-400">Subject:</span>
                <span className="font-semibold text-amber-300 truncate max-w-[220px]">
                  {composerSubject.replace(/{{name}}/gi, resolvedRecipient.name)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Sender Identity:</span>
                <span className="font-mono text-purple-300">"Section F" &lt;your-sending-account@gmail.com&gt;</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              This message will be rendered with Section F responsive styling and sent securely via the transactional connection pool.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                onClick={() => setShowComposerConfirmModal(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendDraftEmail()}
                disabled={composerSending}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg cursor-pointer transition-all flex items-center space-x-1.5"
              >
                {composerSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Confirm & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Campaign */}
      {showConfirmBatchModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#171226] border border-purple-500/50 rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Confirm Cohort Campaign</h4>
                <p className="text-xs text-slate-400">Official Section F Onboarding Dispatch</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to dispatch onboarding claim invitations to <strong className="text-white">{eligibleUnclaimedMembers.length} unclaimed classmates</strong> at their <code className="text-amber-300">school</code> address.
            </p>

            <div className="p-3 bg-[#0B0813] rounded-xl border border-[#2E244A] text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Claimed accounts (Daffy, Angus, Sarah, Eben) are <strong>excluded</strong>.</span>
              </div>
              <div className="flex items-center space-x-1.5 text-amber-300">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Court Adams is <strong>{tempExcludeCourt ? 'temporarily excluded' : 'included'}</strong>.</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Includes disclaimer: <em>"This email is automatically generated"</em>.</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Rate-limited sequentially via Gmail SMTP pooled connection.</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowConfirmBatchModal(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBatchCampaign}
                className="px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#FBBF24] hover:to-[#B45309] text-black font-bold rounded-xl text-xs shadow-lg cursor-pointer transition-all"
              >
                Yes, Dispatch {eligibleUnclaimedMembers.length} Invitations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

