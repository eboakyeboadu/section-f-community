import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  auth, 
  testConnection, 
  fetchUserProfile, 
  saveUserProfile, 
  claimUnclaimedCard,
  createNewProfile,
  sendWelcomeEmailToRegisteredUser,
  deleteUserProfile,
  subscribeToLiveProfiles, 
  logoutUser,
  createCoffeeChatInvitation,
  subscribeToIncomingInvitations,
  updateCoffeeChatInvitationStatus,
  markCoffeeChatInvitationRead,
  subscribeToUserUnreadMessages,
  subscribeToUserCoffeeChats,
  saveUserCoffeeChatToFirestore,
  deleteUserCoffeeChatFromFirestore,
  saveSharedCoffeeChatStatus,
  subscribeToSharedCoffeeChats
} from './services/firebase';
import { SECTION_F_COHORT } from './data/mockProfiles';
import { Profile, TabType, CardSubView, FilterState, CoffeeChatInvitation, ChatMessage, CoffeeChatRecord, CoffeeChatStatus } from './types';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { AuthGate } from './components/AuthGate';
import { CardDeck } from './components/CardDeck';
import { CardSkeletonLoader } from './components/CardSkeletonLoader';
import { DailySpotlight } from './components/DailySpotlight';
import { MyProfileCard } from './components/MyProfileCard';
import { FilterDrawer } from './components/FilterDrawer';
import { GuestPromptModal } from './components/GuestPromptModal';
import { CoffeeChatVerificationModal } from './components/CoffeeChatVerificationModal';
import { CoffeeChatNoteModal } from './components/CoffeeChatNoteModal';
import { CoffeeChatReminderToast } from './components/CoffeeChatReminderToast';
import { NotificationPopover } from './components/NotificationPopover';
import type { LegalTab } from './components/LegalModal';

// Code-Split: Lazy load heavy secondary views and deep modals to keep initial bundle < 250 KB
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal').then((m) => ({ default: m.OnboardingModal })));
const AdminSeedModal = React.lazy(() => import('./components/AdminSeedModal').then((m) => ({ default: m.AdminSeedModal })));
const InfographicsView = React.lazy(() => import('./components/InfographicsView').then((m) => ({ default: m.InfographicsView })));
const CohortCalendarView = React.lazy(() => import('./components/CohortCalendarView').then((m) => ({ default: m.CohortCalendarView })));
const CoffeeChatHistoryView = React.lazy(() => import('./components/CoffeeChatHistoryView').then((m) => ({ default: m.CoffeeChatHistoryView })));
const CardDetailModal = React.lazy(() => import('./components/CardDetailModal').then((m) => ({ default: m.CardDetailModal })));
const LegalModal = React.lazy(() => import('./components/LegalModal').then((m) => ({ default: m.LegalModal })));
const InAppChatModal = React.lazy(() => import('./components/InAppChatModal').then((m) => ({ default: m.InAppChatModal })));
const CoffeeChatInviteModal = React.lazy(() => import('./components/CoffeeChatInviteModal').then((m) => ({ default: m.CoffeeChatInviteModal })));

import { 
  getStoredCoffeeChats, 
  saveStoredCoffeeChats,
  updateCoffeeChatStatus, 
  updateCoffeeChatNotes 
} from './services/coffeeChatStorage';
import { 
  getOverdueCoffeeChatReminders, 
  dismissCoffeeChatReminder, 
  triggerBrowserCoffeeNotification,
  PendingCoffeeReminder 
} from './utils/coffeeChatReminders';
import { Coffee, Calendar as CalendarIcon, ChevronUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { playChimeSound, playPopSound, playTapSound } from './utils/soundEffects';
import { CompactPhotoNudge } from './components/CompactPhotoNudge';
import { registerServiceWorker } from './services/pushNotificationService';
import { 
  registerUserPhotoStatus, 
  checkAndTriggerDuePhotoReminders,
  markUserPhotoUploaded
} from './services/photoReminderService';
import { getHighResGooglePhotoUrl } from './services/imageUtils';
import { trackEvent } from './services/analytics';

// Master launch switch: Set to false whenever you want to switch to 100% real database profiles only
export const SHOW_SAMPLE_PROFILES = true;

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    isGuest?: boolean;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  // User's own Section F Profile
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // Cohort Profiles State
  const [liveProfiles, setLiveProfiles] = useState<Profile[]>([]);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<TabType>('cards');
  const [cardSubView, setCardSubView] = useState<CardSubView>('deck');
  const [coffeeChatSubView, setCoffeeChatSubView] = useState<'tracker' | 'calendar'>('tracker');

  // Filter & Search State
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    countries: [],
    housingTypes: [],
    industries: [],
    explorations: [],
    country: null,
    housingType: null,
    industry: null,
    exploration: null,
    savedOnly: false,
    searchQuery: '',
  });

  // Saved / Bookmarked Profiles State
  const [savedUids, setSavedUids] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('section_f_saved_uids');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Selected Profile for Expanded Detail Modal
  const [selectedDetailProfile, setSelectedDetailProfile] = useState<Profile | null>(null);

  // Guest Prompt Modal State
  const [guestPromptAction, setGuestPromptAction] = useState<string | null>(null);

  // Admin Firestore Seeding Modal State
  const [showAdminSeedModal, setShowAdminSeedModal] = useState<boolean>(false);

  // Legal Privacy & Terms Modal State
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);

  // Coffee Chat Management State
  const [coffeeChatRecords, setCoffeeChatRecords] = useState<Record<string, CoffeeChatRecord>>(() => {
    return getStoredCoffeeChats();
  });
  const [coffeeChatPendingProfile, setCoffeeChatPendingProfile] = useState<Profile | null>(null);
  const [coffeeChatNoteProfile, setCoffeeChatNoteProfile] = useState<Profile | null>(null);
  const [activeCoffeeReminder, setActiveCoffeeReminder] = useState<PendingCoffeeReminder | null>(null);

  // Coffee Chat In-App Invitations & Notifications State
  const [incomingInvitations, setIncomingInvitations] = useState<CoffeeChatInvitation[]>([]);
  const [showNotificationPopover, setShowNotificationPopover] = useState<boolean>(false);
  const [coffeeChatInviteModalRecipient, setCoffeeChatInviteModalRecipient] = useState<Profile | null>(null);

  // In-App Direct Chat State
  const [chatRecipientProfile, setChatRecipientProfile] = useState<Profile | null>(null);
  const [unreadChatMessages, setUnreadChatMessages] = useState<ChatMessage[]>([]);

  // Smooth Scroll-to-Top Floating Visibility State
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    const handleWindowScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollPos > 150) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  const isGuest = Boolean(currentUser?.isGuest);
  const ADMIN_EMAILS = ['admin@example.com'];
  const isUserAdmin = Boolean(
    !isGuest &&
    ((currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) ||
     (userProfile?.email && ADMIN_EMAILS.includes(userProfile.email.toLowerCase())))
  );

  // Exclude Admin testing account (Lauriel) so it is NEVER visible to classmates or in cohort deck/spotlight
  const isExcludedProfile = (p: Profile): boolean => {
    const email = (p.email || '').toLowerCase().trim();
    const fullName = (p.fullName || '').toLowerCase().trim();
    const nickname = (p.nickname || '').toLowerCase().trim();

    if (ADMIN_EMAILS.some((adm) => adm.toLowerCase() === email)) {
      return true;
    }
    if (fullName.includes('lauriel') || nickname.includes('lauriel')) {
      return true;
    }
    if (isUserAdmin && currentUser?.uid && p.uid === currentUser.uid) {
      return true;
    }
    return false;
  };

  // Check for 24h overdue 'request_sent' coffee chats (Non-guest only)
  useEffect(() => {
    if (isGuest || !currentUser) {
      setActiveCoffeeReminder(null);
      return;
    }

    const checkOverdueReminders = () => {
      const baseCohort = liveProfiles.length > 0 ? liveProfiles : SECTION_F_COHORT;
      const cohortList = baseCohort.filter((p) => !isExcludedProfile(p));
      const overdueList = getOverdueCoffeeChatReminders(cohortList, coffeeChatRecords);
      if (overdueList.length > 0) {
        const topReminder = overdueList[0];
        setActiveCoffeeReminder(topReminder);

        // Gently trigger browser push notification if supported and granted
        triggerBrowserCoffeeNotification(topReminder, () => {
          setCoffeeChatNoteProfile(topReminder.profile);
        });
      } else {
        setActiveCoffeeReminder(null);
      }
    };

    // Check on mount and periodically every 5 minutes
    const timer = setTimeout(checkOverdueReminders, 1200);
    const interval = setInterval(checkOverdueReminders, 5 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isGuest, currentUser, coffeeChatRecords, liveProfiles]);

  // Window focus and visibility listener: detect when user returns to app after initiating coffee chat
  useEffect(() => {
    if (isGuest) return;
    const handleReturnToApp = () => {
      try {
        const pendingUid = sessionStorage.getItem('pending_coffee_chat_uid');
        if (pendingUid) {
          // Find classmate
          const found = SECTION_F_COHORT.find((p) => p.uid === pendingUid) || 
            liveProfiles.find((p) => p.uid === pendingUid);
          if (found) {
            setCoffeeChatPendingProfile(found);
          }
          sessionStorage.removeItem('pending_coffee_chat_uid');
        }
      } catch (e) {}
    };

    window.addEventListener('focus', handleReturnToApp);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleReturnToApp();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleReturnToApp);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [liveProfiles]);

  // Sync saved profiles when user profile loads from Firestore
  useEffect(() => {
    if (userProfile?.savedProfileUids && Array.isArray(userProfile.savedProfileUids)) {
      setSavedUids(userProfile.savedProfileUids);
      try {
        localStorage.setItem('section_f_saved_uids', JSON.stringify(userProfile.savedProfileUids));
      } catch (e) {}
    }
  }, [userProfile?.savedProfileUids]);

  // Initialize Firebase connection, Service Worker, and auth listener
  useEffect(() => {
    // Safety timeout: never hang on splash screen for more than 1.5 seconds
    const splashFallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 1500);

    testConnection();
    registerServiceWorker().catch(() => {});

    // Check if launched from a photo reminder notification or email campaign link
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'upload-photo') {
        setIsEditingProfile(true);
      }

      // Check if user clicked email campaign or onboarding link
      const src = params.get('src');
      const campaign = params.get('c');
      const ref = params.get('ref');
      if (src === 'email_click' || campaign === 'claim_invitation' || ref === 'email_invite') {
        const clickLoggedKey = `secf_clk_${params.get('msgId') || campaign || 'generic'}`;
        if (!sessionStorage.getItem(clickLoggedKey)) {
          sessionStorage.setItem(clickLoggedKey, '1');
          trackEvent('email_link_clicked', {
            source: src || 'email',
            campaign: campaign || 'claim_invitation',
            ref: ref || undefined,
          });
        }
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      try {
        if (user) {
          // If user was previously in guest mode during this session, record guest conversion
          try {
            if (sessionStorage.getItem('secf_guest_mode_active')) {
              sessionStorage.removeItem('secf_guest_mode_active');
              trackEvent('guest_mode_converted', { email: user.email || '' });
            }
          } catch (e) {}

          const highResPhoto = getHighResGooglePhotoUrl(user.photoURL) || undefined;
          const userInfo = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || undefined,
            photoURL: highResPhoto,
            isGuest: false,
          };
          setCurrentUser(userInfo);

          // Fetch Firestore profile safely
          try {
            const profile = await fetchUserProfile(user.uid);
            if (profile) {
              setUserProfile(profile);
              setShowOnboarding(false);
              // Ensure registered users receive their welcome email strictly once to their login email
              if (!profile.welcomeEmailSentAt) {
                sendWelcomeEmailToRegisteredUser(user.uid, profile).catch(() => {});
              }
              // Check if photo reminder is due
              checkAndTriggerDuePhotoReminders(profile).catch(() => {});
            } else {
              // New user needs to onboard
              setShowOnboarding(true);
              registerUserPhotoStatus(user.uid, user.email || '', highResPhoto).catch(() => {});
            }
          } catch (profileErr) {
            console.warn('Profile fetch error during startup:', profileErr);
          }
        } else {
          // If not in guest mode, clear state
          setCurrentUser((prev) => (prev?.isGuest ? prev : null));
          setUserProfile((prev) => (currentUser?.isGuest ? prev : null));
        }
      } catch (err) {
        console.warn('Auth state error during startup:', err);
      } finally {
        clearTimeout(splashFallbackTimer);
        setAuthLoading(false);
      }
    });

    return () => {
      clearTimeout(splashFallbackTimer);
      unsubscribe();
    };
  }, []);

  // Subscribe to live Firestore profiles
  useEffect(() => {
    try {
      const unsub = subscribeToLiveProfiles((fetchedProfiles) => {
        if (fetchedProfiles && Array.isArray(fetchedProfiles)) {
          setLiveProfiles(fetchedProfiles);
        }
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    } catch (e) {
      console.warn("Firestore profiles subscription error:", e);
    }
  }, []);

  // Merge live Firestore profiles with seed directory, ensuring real claimed profiles
  // 100% replace and eliminate matching sample profiles so no classmate is ever duplicated.
  // Exclude Admin test accounts (Lauriel) so testing accounts NEVER appear in the public deck, spotlight, or directory
  const allProfiles = useMemo(() => {
    const normalizeKey = (str?: string | null): string =>
      (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Gather all live claimed profiles from Firestore
    const claimedProfiles: Profile[] = [];
    const claimedNames = new Set<string>();
    const claimedEmails = new Set<string>();
    const claimedCardIds = new Set<string>();

    // Combine live Firestore profiles and current user's profile
    const rawLive = [...liveProfiles];
    if (userProfile && !isGuest && !rawLive.some((p) => p.uid === userProfile.uid)) {
      rawLive.push(userProfile);
    }

    rawLive.forEach((p) => {
      if (isExcludedProfile(p)) return;

      const isSelf = Boolean(
        currentUser && !isGuest && (
          p.uid === currentUser.uid ||
          (currentUser.email && p.email && currentUser.email.toLowerCase() === p.email.toLowerCase())
        )
      );

      claimedProfiles.push({
        ...p,
        isSample: false,
        isCurrentUser: isSelf,
      });

      // Track all identifier variations of this real claimed classmate
      if (p.fullName) {
        claimedNames.add(normalizeKey(p.fullName));
        const slug = p.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        claimedCardIds.add(slug);
      }
      if (p.email) claimedEmails.add(normalizeKey(p.email));
      if (p.authEmail) claimedEmails.add(normalizeKey(p.authEmail));
      if (p.unclaimedCardId) claimedCardIds.add(p.unclaimedCardId);
    });

    // 2. From seed cohort, only keep profiles that have NOT yet been claimed by any real user
    const remainingSampleProfiles: Profile[] = [];
    if (SHOW_SAMPLE_PROFILES) {
      SECTION_F_COHORT.forEach((sample) => {
        if (isExcludedProfile(sample)) return;

        const normName = normalizeKey(sample.fullName);
        const normEmail = normalizeKey(sample.email);
        const normAuthEmail = normalizeKey(sample.authEmail);
        const sampleSlug = sample.uid; // e.g. "sarah-alpert"

        const isAlreadyClaimed =
          claimedNames.has(normName) ||
          (normEmail && claimedEmails.has(normEmail)) ||
          (normAuthEmail && claimedEmails.has(normAuthEmail)) ||
          claimedCardIds.has(sampleSlug);

        // If not claimed by a live user, keep as sample profile
        if (!isAlreadyClaimed) {
          remainingSampleProfiles.push({ ...sample, isSample: true });
        }
      });
    }

    // 3. Combine real claimed profiles and remaining unclaimed samples
    const combined = [...claimedProfiles, ...remainingSampleProfiles];

    // 4. Sort: Current user first, followed by real signed-up classmates, then remaining sample profiles
    return combined.sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      if (!a.isSample && b.isSample) return -1;
      if (a.isSample && !b.isSample) return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [liveProfiles, userProfile, isGuest, isUserAdmin, currentUser]);

  // Extract available filter values
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach((p) => set.add(p.homeCountry));
    return Array.from(set).sort();
  }, [allProfiles]);

  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach((p) => set.add(p.preHbsIndustry));
    return Array.from(set).sort();
  }, [allProfiles]);

  const availableExplorations = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach((p) => {
      p.postHbsExploration.forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [allProfiles]);

  // Filtered profiles for deck / list
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter((p) => {
      // 1. Countries filter
      const selectedCountries = filters.countries && filters.countries.length > 0
        ? filters.countries
        : (filters.country ? [filters.country] : []);
      if (selectedCountries.length > 0 && !selectedCountries.includes(p.homeCountry)) {
        return false;
      }

      // 2. Housing filter
      const selectedHousing = filters.housingTypes && filters.housingTypes.length > 0
        ? filters.housingTypes
        : (filters.housingType ? [filters.housingType] : []);
      if (selectedHousing.length > 0) {
        const matchesHousing = selectedHousing.some((h) => 
          (p.housingBuilding && p.housingBuilding === h) ||
          (p.housingType && p.housingType === h) ||
          (p.housingDetail && p.housingDetail.toLowerCase().includes(h.toLowerCase()))
        );
        if (!matchesHousing) return false;
      }

      // 3. Pre-HBS Industry filter
      const selectedIndustries = filters.industries && filters.industries.length > 0
        ? filters.industries
        : (filters.industry ? [filters.industry] : []);
      if (selectedIndustries.length > 0 && !selectedIndustries.includes(p.preHbsIndustry)) {
        return false;
      }

      // 4. Target Career Exploration filter
      const selectedExplorations = filters.explorations && filters.explorations.length > 0
        ? filters.explorations
        : (filters.exploration ? [filters.exploration] : []);
      if (selectedExplorations.length > 0) {
        const matchesExp = selectedExplorations.some((exp) =>
          p.postHbsExploration && p.postHbsExploration.includes(exp)
        );
        if (!matchesExp) return false;
      }

      // 5. Saved/Bookmarked filter
      if (filters.savedOnly && !savedUids.includes(p.uid)) {
        return false;
      }

      // 6. Search query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchName = p.fullName.toLowerCase().includes(q) || (p.nickname && p.nickname.toLowerCase().includes(q));
        const matchCompany = p.preHbsCompany.toLowerCase().includes(q);
        const matchRole = p.preHbsRole.toLowerCase().includes(q);
        const matchCountry = p.homeCountry.toLowerCase().includes(q);
        const matchHometown = p.hometown.toLowerCase().includes(q);
        const matchExploration = p.postHbsExploration.some((tag) => tag.toLowerCase().includes(q));
        const matchHobby = p.hobbies && p.hobbies.toLowerCase().includes(q);
        const matchSchool = p.undergradSchool.toLowerCase().includes(q);
        
        if (!matchName && !matchCompany && !matchRole && !matchCountry && !matchHometown && !matchExploration && !matchHobby && !matchSchool) {
          return false;
        }
      }
      return true;
    });
  }, [allProfiles, filters, savedUids]);

  // Count of events/birthdays occurring today for the calendar navigation dock badge
  const todayEventsCount = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    let count = 0;
    allProfiles.forEach((p) => {
      if (p.birthdayMonth && p.birthdayDay) {
        const mIdx = months.findIndex((m) => p.birthdayMonth!.toLowerCase().startsWith(m));
        if (mIdx === todayMonth && parseInt(p.birthdayDay, 10) === todayDate) {
          count++;
        }
      } else if (p.birthday) {
        const parts = p.birthday.trim().split(/[\s,/-]+/);
        if (parts.length >= 2) {
          const mIdx = months.findIndex((m) => parts[0].toLowerCase().startsWith(m));
          const dNum = parseInt(parts[1], 10);
          if (mIdx === todayMonth && dNum === todayDate) {
            count++;
          }
        }
      }
    });
    return count;
  }, [allProfiles]);

  // Handle Guest Demo Access
  const handleDemoLogin = () => {
    const guestUser = {
      uid: 'guest_visitor',
      email: 'guest@example.com',
      displayName: 'Section F Guest',
      photoURL: '',
      isGuest: true,
    };

    const samplePreviewProfile: Profile = {
      uid: 'guest_visitor',
      fullName: 'Alex Morgan',
      nickname: 'Alex',
      email: 'alex.morgan@example.com',
      phone: '+1 617-555-0144',
      whatsapp: '+1 617-555-0144',
      notOnWhatsApp: false,
      birthday: '09/21',
      photoUrl: '',
      homeCountry: 'United States',
      countryCode: 'US',
      hometown: 'Austin, TX',
      housingType: 'dorm',
      housingDetail: 'Mellon Hall A-14',
      preHbsCompany: 'Tesla',
      preHbsRole: 'Senior Autopilot Product Manager',
      preHbsIndustry: 'Tech / Product',
      companyUrl: 'https://www.tesla.com',
      undergradSchool: 'UT Austin (ECE)',
      postHbsExploration: ['AI & Robotics', 'Climate Tech', 'Early-Stage VC'],
      languages: ['English', 'Spanish'],
      countriesLived: 'USA (26y)',
      funFact: 'Rebuilt a vintage 1974 electric Porsche 914 from scratch in my garage.',
      hobbies: 'Electric karting, Texas BBQ pitmaster, road cycling',
      venmoHandle: '@alex-morgan-f',
      zelleInfo: 'alex.morgan@austin.utexas.edu',
      hasPartner: false,
      privacyLevel: 'share_all',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCurrentUser: false,
    };

    try {
      sessionStorage.setItem('secf_guest_mode_active', '1');
    } catch (e) {}

    setCurrentUser(guestUser);
    setUserProfile(samplePreviewProfile);
    setShowOnboarding(false);
  };

  // Handle Profile Save
  const handleProfileSaved = async (saved: Profile) => {
    if (isGuest) {
      setGuestPromptAction('Publish Profile Card');
      return;
    }
    const cleanSaved: Profile = {
      ...saved,
      photoUrl: getHighResGooglePhotoUrl(saved.photoUrl),
    };
    setUserProfile(cleanSaved);

    if (cleanSaved.unclaimedCardId) {
      await claimUnclaimedCard(cleanSaved.unclaimedCardId, currentUser?.uid || cleanSaved.uid, cleanSaved);
    } else if (!userProfile) {
      await createNewProfile(currentUser?.uid || cleanSaved.uid, cleanSaved);
    } else {
      await saveUserProfile(cleanSaved);
    }

    if (cleanSaved.photoUrl && cleanSaved.photoUrl.trim() !== '') {
      markUserPhotoUploaded(cleanSaved.uid).catch(() => {});
    }

    setShowOnboarding(false);
    setIsEditingProfile(false);
  };

  // Handle Profile Deletion from Firestore Database
  const handleDeleteProfile = async () => {
    if (!currentUser || isGuest) return;
    try {
      await deleteUserProfile(currentUser.uid);
      setUserProfile(null);
      setLiveProfiles((prev) => prev.filter((p) => p.uid !== currentUser.uid));
      setShowOnboarding(true);
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to delete profile from Firestore:', err);
      throw err;
    }
  };

  // Handle Sign Out / Exit Guest Mode
  const handleSignOut = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
    setShowOnboarding(false);
  };

  // Filter trigger shortcuts (from Infographics, charts, world map, or card badges)
  // Per user requirement: tapping an external category shortcut filters SOLELY by that attribute.
  // Multi-category filtering is strictly reserved for when the user opens the Filter Menu drawer.
  const handleCountryFilter = (country: string) => {
    setFilters((prev) => {
      const isAlready = prev.countries?.includes(country) || prev.country === country;
      return {
        countries: isAlready ? [] : [country],
        housingTypes: [],
        industries: [],
        explorations: [],
        country: isAlready ? null : country,
        housingType: null,
        industry: null,
        exploration: null,
        savedOnly: false,
        searchQuery: '',
      };
    });
    setCardSubView('deck');
  };

  const handleHousingFilter = (housing: string) => {
    setFilters((prev) => {
      const isAlready = prev.housingTypes?.includes(housing) || prev.housingType === housing;
      return {
        countries: [],
        housingTypes: isAlready ? [] : [housing],
        industries: [],
        explorations: [],
        country: null,
        housingType: isAlready ? null : housing,
        industry: null,
        exploration: null,
        savedOnly: false,
        searchQuery: '',
      };
    });
    setCardSubView('deck');
  };

  const handleExplorationFilter = (tag: string) => {
    setFilters((prev) => {
      const isAlready = prev.explorations?.includes(tag) || prev.exploration === tag;
      return {
        countries: [],
        housingTypes: [],
        industries: [],
        explorations: isAlready ? [] : [tag],
        country: null,
        housingType: null,
        industry: null,
        exploration: isAlready ? null : tag,
        savedOnly: false,
        searchQuery: '',
      };
    });
    setCardSubView('deck');
  };

  const handleIndustryFilter = (industry: string) => {
    setFilters((prev) => {
      const isAlready = prev.industries?.includes(industry) || prev.industry === industry;
      return {
        countries: [],
        housingTypes: [],
        industries: isAlready ? [] : [industry],
        explorations: [],
        country: null,
        housingType: null,
        industry: isAlready ? null : industry,
        exploration: null,
        savedOnly: false,
        searchQuery: '',
      };
    });
    setCardSubView('deck');
  };

  const handleResetFilters = () => {
    setFilters({
      countries: [],
      housingTypes: [],
      industries: [],
      explorations: [],
      country: null,
      housingType: null,
      industry: null,
      exploration: null,
      savedOnly: false,
      searchQuery: '',
    });
  };

  // Handle Bookmarking / Favoriting a classmate profile
  const handleToggleSave = async (target: Profile) => {
    // Intercept guests: Saving requires a real Section F account
    if (isGuest) {
      setGuestPromptAction('bookmark');
      return;
    }

    playPopSound();
    const isAlreadySaved = savedUids.includes(target.uid);
    const newSaved = isAlreadySaved
      ? savedUids.filter((id) => id !== target.uid)
      : [...savedUids, target.uid];

    setSavedUids(newSaved);
    try {
      localStorage.setItem('section_f_saved_uids', JSON.stringify(newSaved));
    } catch (e) {}

    // Persist in Firestore user profile if authenticated
    if (userProfile && !isGuest) {
      const updatedProfile = {
        ...userProfile,
        savedProfileUids: newSaved,
      };
      setUserProfile(updatedProfile);
      try {
        await saveUserProfile(updatedProfile);
      } catch (err) {
        console.error('Failed to save bookmark in Firestore:', err);
      }
    }
  };

  // Guard guest mode: if guest is on coffee chats tracker, route to calendar view
  useEffect(() => {
    if (isGuest && currentTab === 'coffee_chats' && coffeeChatSubView === 'tracker') {
      setCoffeeChatSubView('calendar');
    }
  }, [isGuest, currentTab, coffeeChatSubView]);

  const handleTabChange = (tab: TabType) => {
    if (tab === 'calendar') {
      setCurrentTab('coffee_chats');
      setCoffeeChatSubView('calendar');
      return;
    }
    if (isGuest && tab === 'coffee_chats') {
      // Allow guests to view the Cohort Calendar under Coffee Chats
      setCurrentTab('coffee_chats');
      setCoffeeChatSubView('calendar');
      return;
    }
    setCurrentTab(tab);
  };

  // Track feature and tab engagement
  useEffect(() => {
    if (currentTab === 'cards') {
      if (cardSubView === 'deck') {
        trackEvent('view_deck');
      } else if (cardSubView === 'infographics') {
        trackEvent('view_atlas');
      }
    } else if (currentTab === 'spotlight') {
      trackEvent('view_spotlight');
    } else if (currentTab === 'coffee_chats') {
      trackEvent('view_coffee_chat', { subView: coffeeChatSubView });
    }
  }, [currentTab, cardSubView, coffeeChatSubView]);

  // Subscribe to real-time incoming coffee chat invitations
  useEffect(() => {
    if (!currentUser || isGuest) {
      setIncomingInvitations([]);
      return;
    }

    const unsubscribe = subscribeToIncomingInvitations(currentUser.uid, (invites) => {
      setIncomingInvitations(invites);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, isGuest]);

  // Subscribe to real-time unread in-app direct messages
  useEffect(() => {
    if (!currentUser || isGuest) {
      setUnreadChatMessages([]);
      return;
    }

    const unsubscribe = subscribeToUserUnreadMessages(currentUser.uid, (msgs) => {
      setUnreadChatMessages(msgs);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, isGuest]);

  // Subscribe to real-time private coffee chat records from Firestore (cross-device sync)
  useEffect(() => {
    if (!currentUser || isGuest) return;

    const unsubscribePrivate = subscribeToUserCoffeeChats(currentUser.uid, (cloudRecords) => {
      if (cloudRecords && typeof cloudRecords === 'object') {
        setCoffeeChatRecords((prev) => {
          const merged = { ...prev, ...cloudRecords };
          try {
            saveStoredCoffeeChats(merged);
          } catch (e) {}
          return merged;
        });
      }
    });

    // Subscribe to shared coffee chats (syncs counterparty status updates in real-time)
    const unsubscribeShared = subscribeToSharedCoffeeChats(currentUser.uid, (sharedDocs) => {
      if (Array.isArray(sharedDocs) && sharedDocs.length > 0) {
        setCoffeeChatRecords((prev) => {
          let hasChanges = false;
          const updated = { ...prev };

          for (const doc of sharedDocs) {
            const counterpartyUid = doc.participants.find((id) => id !== currentUser.uid);
            if (!counterpartyUid) continue;

            const existing = updated[counterpartyUid];
            if (
              !existing || 
              existing.status !== doc.status || 
              existing.scheduledDate !== doc.scheduledDate || 
              existing.scheduledTime !== doc.scheduledTime ||
              existing.locationOrTopic !== doc.locationOrTopic ||
              existing.completedAt !== doc.completedAt
            ) {
              hasChanges = true;
              updated[counterpartyUid] = {
                classmateUid: counterpartyUid,
                status: doc.status,
                notes: existing?.notes || '',
                takeaways: existing?.takeaways || [],
                locationOrTopic: doc.locationOrTopic || existing?.locationOrTopic || '',
                scheduledDate: doc.scheduledDate || existing?.scheduledDate,
                scheduledTime: doc.scheduledTime || existing?.scheduledTime,
                completedAt: doc.completedAt || existing?.completedAt,
                requestedAt: existing?.requestedAt || doc.updatedAt,
                updatedAt: doc.updatedAt,
              };
            }
          }

          if (hasChanges) {
            try {
              saveStoredCoffeeChats(updated);
            } catch (e) {}
            return updated;
          }
          return prev;
        });
      }
    });

    return () => {
      unsubscribePrivate();
      unsubscribeShared();
    };
  }, [currentUser, isGuest]);


  // Initiate Coffee Chat - Open dedicated composer modal with dates, times, and templates
  const handleInitiateCoffeeChat = (target: Profile) => {
    if (isGuest) {
      setGuestPromptAction('Direct Classmate Features');
      return;
    }
    setCoffeeChatInviteModalRecipient(target);
  };

  // Dispatch Coffee Chat Invite: write to Firestore and open draft in mail or WhatsApp client
  const handleSendCoffeeChatInvite = async (invitePayload: {
    proposedDate: string;
    proposedTime: string;
    location: string;
    templateType: 'casual' | 'career' | 'interests' | 'custom';
    channel: 'email' | 'whatsapp' | 'in_app';
    message: string;
    subject: string;
  }) => {
    if (!coffeeChatInviteModalRecipient || !currentUser) return;
    const target = coffeeChatInviteModalRecipient;

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });

    try {
      sessionStorage.setItem('pending_coffee_chat_uid', target.uid);
    } catch (e) {}

    trackEvent('create_coffee_invite', { channel: invitePayload.channel });

    // 1. Create in-app invitation in Firestore for recipient
    try {
      await createCoffeeChatInvitation({
        senderUid: currentUser.uid,
        senderName: userProfile?.fullName || currentUser.displayName || 'Section F Classmate',
        senderEmail: currentUser.email || userProfile?.email || '',
        senderPhone: userProfile?.phone || userProfile?.whatsapp || '',
        senderPhoto: userProfile?.photoUrl || currentUser.photoURL || '',
        recipientUid: target.uid,
        recipientName: target.fullName,
        recipientEmail: target.email,
        proposedDate: invitePayload.proposedDate,
        proposedTime: invitePayload.proposedTime,
        location: invitePayload.location,
        templateType: invitePayload.templateType,
        channel: invitePayload.channel,
        message: invitePayload.message,
      });
    } catch (err) {
      console.warn('Could not save coffee chat invitation in Firestore:', err);
    }

    // 2. Update local tracking status
    const updated = updateCoffeeChatStatus(target.uid, 'request_sent', coffeeChatRecords);
    setCoffeeChatRecords(updated);
    if (currentUser && !isGuest && updated[target.uid]) {
      saveUserCoffeeChatToFirestore(currentUser.uid, target.uid, updated[target.uid]).catch(() => {});
      saveSharedCoffeeChatStatus(currentUser.uid, target.uid, {
        status: 'request_sent',
        locationOrTopic: invitePayload.location,
        scheduledDate: invitePayload.proposedDate,
        scheduledTime: invitePayload.proposedTime,
      }).catch(() => {});
    }

    // 3. Dispatch via selected channel: WhatsApp, Email, or In-App Direct Message
    if (invitePayload.channel === 'whatsapp' && target.whatsapp && !target.notOnWhatsApp) {
      const cleanPhone = target.whatsapp.replace(/[^0-9]/g, '');
      const encodedMsg = encodeURIComponent(invitePayload.message);
      window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;
    } else if (invitePayload.channel === 'in_app') {
      setChatRecipientProfile(target);
    } else {
      const subject = encodeURIComponent(invitePayload.subject);
      const body = encodeURIComponent(invitePayload.message);
      window.location.href = `mailto:${encodeURIComponent(target.email)}?subject=${subject}&body=${body}`;
    }

    setCoffeeChatInviteModalRecipient(null);
  };

  // Accept incoming coffee chat invitation
  const handleAcceptInvitation = async (invitation: CoffeeChatInvitation) => {
    playChimeSound();
    confetti({
      particleCount: 70,
      spread: 55,
      origin: { y: 0.6 }
    });

    try {
      await updateCoffeeChatInvitationStatus(invitation.id, 'accepted', true);
    } catch (err) {
      console.error('Error accepting invitation:', err);
    }

    // Update local coffee chat status for the sender
    const updated = updateCoffeeChatStatus(invitation.senderUid, 'scheduled', coffeeChatRecords);
    setCoffeeChatRecords(updated);
    if (currentUser && !isGuest && updated[invitation.senderUid]) {
      saveUserCoffeeChatToFirestore(currentUser.uid, invitation.senderUid, updated[invitation.senderUid]).catch((err) => {
        console.warn('Could not sync coffee chat status to Firestore:', err);
      });
      saveSharedCoffeeChatStatus(currentUser.uid, invitation.senderUid, {
        status: 'scheduled',
        locationOrTopic: invitation.location || 'Spangler Grille',
        scheduledDate: invitation.proposedDate,
        scheduledTime: invitation.proposedTime,
      }).catch((err) => {
        console.warn('Could not sync shared coffee chat status to Firestore:', err);
      });
    }
  };

  // Decline incoming coffee chat invitation
  const handleDeclineInvitation = async (invitation: CoffeeChatInvitation) => {
    try {
      await updateCoffeeChatInvitationStatus(invitation.id, 'declined', true);
    } catch (err) {
      console.error('Error declining invitation:', err);
    }
  };

  // Mark all unread notifications as read
  const handleMarkAllNotificationsRead = async () => {
    const unread = incomingInvitations.filter((inv) => !inv.read);
    for (const inv of unread) {
      try {
        await markCoffeeChatInvitationRead(inv.id);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Confirm Coffee Chat invitation email was sent
  const handleConfirmCoffeeChatSent = (target: Profile) => {
    playChimeSound();
    const updated = updateCoffeeChatStatus(target.uid, 'request_sent', coffeeChatRecords);
    setCoffeeChatRecords(updated);
    setCoffeeChatPendingProfile(null);
    if (currentUser && !isGuest && updated[target.uid]) {
      saveUserCoffeeChatToFirestore(currentUser.uid, target.uid, updated[target.uid]).catch((err) => {
        console.warn('Could not sync coffee chat status to Firestore:', err);
      });
      saveSharedCoffeeChatStatus(currentUser.uid, target.uid, {
        status: 'request_sent',
      }).catch((err) => {
        console.warn('Could not sync shared coffee chat status to Firestore:', err);
      });
    }
  };

  // Revert Coffee Chat tracking if user indicates they did NOT send the invite
  const handleDeclineCoffeeChatSent = (target: Profile) => {
    playTapSound();
    const updated = updateCoffeeChatStatus(target.uid, 'none', coffeeChatRecords);
    setCoffeeChatRecords(updated);
    setCoffeeChatPendingProfile(null);
    try {
      sessionStorage.removeItem('pending_coffee_chat_uid');
    } catch (e) {}
    if (currentUser && !isGuest) {
      deleteUserCoffeeChatFromFirestore(currentUser.uid, target.uid).catch(() => {});
      saveSharedCoffeeChatStatus(currentUser.uid, target.uid, {
        status: 'none',
      }).catch(() => {});
    }
  };

  // Save notes and status updates for a classmate
  const handleSaveCoffeeChatNotes = (
    classmateUid: string,
    updates: {
      status?: CoffeeChatStatus;
      notes?: string;
      takeaways?: string[];
      locationOrTopic?: string;
      completedAt?: string;
      scheduledDate?: string;
      scheduledTime?: string;
    }
  ) => {
    playChimeSound();
    const updated = updateCoffeeChatNotes(classmateUid, updates, coffeeChatRecords);
    setCoffeeChatRecords(updated);
    if (currentUser && !isGuest && updated[classmateUid]) {
      saveUserCoffeeChatToFirestore(currentUser.uid, classmateUid, updated[classmateUid]).catch((err) => {
        console.warn('Could not sync coffee chat notes to Firestore:', err);
      });
      saveSharedCoffeeChatStatus(currentUser.uid, classmateUid, {
        status: updated[classmateUid].status,
        scheduledDate: updated[classmateUid].scheduledDate,
        scheduledTime: updated[classmateUid].scheduledTime,
        locationOrTopic: updated[classmateUid].locationOrTopic,
        completedAt: updated[classmateUid].completedAt,
      }).catch((err) => {
        console.warn('Could not sync shared coffee chat status to Firestore:', err);
      });
    }
  };

  // Delete/Clear coffee chat record
  const handleDeleteCoffeeChatRecord = (classmateUid: string) => {
    const updated = updateCoffeeChatStatus(classmateUid, 'none', coffeeChatRecords);
    setCoffeeChatRecords(updated);
    if (currentUser && !isGuest) {
      deleteUserCoffeeChatFromFirestore(currentUser.uid, classmateUid).catch((err) => {
        console.warn('Could not delete coffee chat record from Firestore:', err);
      });
      saveSharedCoffeeChatStatus(currentUser.uid, classmateUid, {
        status: 'none',
      }).catch(() => {});
    }
  };

  // If Auth is loading, render high-fidelity CardSkeletonLoader
  if (authLoading) {
    return <CardSkeletonLoader />;
  }

  // If user is not authenticated, show Auth Gate
  if (!currentUser) {
    return (
      <>
        <AuthGate
          onAuthenticated={(user) => {
            setCurrentUser({ ...user, isGuest: false });
          }}
          onDemoLogin={handleDemoLogin}
          onOpenPrivacy={() => setLegalModalTab('privacy')}
          onOpenTerms={() => setLegalModalTab('terms')}
        />
        <Suspense fallback={null}>
          <LegalModal
            isOpen={Boolean(legalModalTab)}
            activeTab={legalModalTab || 'privacy'}
            onTabChange={setLegalModalTab}
            onClose={() => setLegalModalTab(null)}
          />
        </Suspense>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0813] text-slate-100 flex flex-col selection:bg-[#F59E0B] selection:text-black font-sans">
      
      {/* Onboarding Gate Modal (Only for non-guest verified users) */}
      {!isGuest && (showOnboarding || isEditingProfile) && (
        <Suspense fallback={<CardSkeletonLoader />}>
          <OnboardingModal
            initialUid={currentUser.uid}
            initialEmail={currentUser.email}
            initialName={currentUser.displayName}
            initialPhotoUrl={currentUser.photoURL}
            onProfileSaved={handleProfileSaved}
            isEditing={isEditingProfile}
            existingProfile={userProfile}
            onCloseEdit={() => setIsEditingProfile(false)}
            onDeleteProfile={handleDeleteProfile}
            onSignOut={handleSignOut}
          />
        </Suspense>
      )}

      {/* Persistent App Header */}
      <Header
        currentTab={currentTab}
        cardSubView={cardSubView}
        isGuest={isGuest}
        onSubViewChange={setCardSubView}
        onOpenFilter={() => setShowFilterDrawer(true)}
        onToggleSearch={() => setShowSearch(!showSearch)}
        showSearch={showSearch}
        filters={filters}
        onSearchChange={(q) => setFilters({ ...filters, searchQuery: q })}
        totalClassmates={allProfiles.length}
        onSignInRequested={handleSignOut}
        unreadNotificationCount={
          incomingInvitations.filter((inv) => !inv.read).length + unreadChatMessages.length
        }
        onToggleNotifications={() => setShowNotificationPopover(!showNotificationPopover)}
        showNotifications={showNotificationPopover}
      />

      {/* Real-time In-App Notification Drawer / Popover */}
      <NotificationPopover
        isOpen={showNotificationPopover}
        invitations={incomingInvitations}
        unreadMessages={unreadChatMessages}
        onClose={() => setShowNotificationPopover(false)}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSelectClassmateProfile={(uid) => {
          const found = allProfiles.find((p) => p.uid === uid);
          if (found) setSelectedDetailProfile(found);
          setShowNotificationPopover(false);
        }}
        onOpenChatWithSender={(senderUid) => {
          const found = allProfiles.find((p) => p.uid === senderUid);
          if (found) {
            setChatRecipientProfile(found);
          }
          setShowNotificationPopover(false);
        }}
      />

      {/* Main Tab Content View */}
      <main className={`flex-1 px-3 sm:px-4 ${(currentTab === 'calendar' || (currentTab === 'coffee_chats' && coffeeChatSubView === 'calendar')) ? 'max-w-4xl' : 'max-w-md'} mx-auto w-full ${currentTab === 'cards' && cardSubView === 'deck' ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : 'pb-[calc(7.5rem+env(safe-area-inset-bottom))]'} overflow-x-hidden`}>
        {/* Sleek, space-saving photo reminder nudge for profiles without a photo */}
        {!isGuest && currentUser && (!userProfile?.photoUrl || userProfile.photoUrl.trim() === '') && (
          <CompactPhotoNudge
            onAddPhoto={() => setIsEditingProfile(true)}
            userUid={currentUser.uid}
          />
        )}

        {/* Tab 1: Cards */}
        {currentTab === 'cards' && (
          <div>
            {cardSubView === 'deck' ? (
              <CardDeck
                profiles={filteredProfiles}
                savedUids={savedUids}
                coffeeChatRecords={coffeeChatRecords}
                onToggleSave={handleToggleSave}
                showSavedOnly={Boolean(filters.savedOnly)}
                onToggleSavedOnly={() => setFilters((prev) => ({ ...prev, savedOnly: !prev.savedOnly }))}
                currentUserName={userProfile?.fullName || currentUser.displayName}
                isGuest={isGuest}
                onOpenDetails={(p) => setSelectedDetailProfile(p)}
                onOpenCoffeeChatNote={(p) => setCoffeeChatNoteProfile(p)}
                onOpenInAppChat={(p) => setChatRecipientProfile(p)}
                onCoffeeChatAction={handleInitiateCoffeeChat}
                onResetFilters={handleResetFilters}
                onGuestActionPrompt={(action) => setGuestPromptAction(action)}
              />
            ) : (
              <Suspense fallback={<CardSkeletonLoader />}>
                <InfographicsView
                  profiles={allProfiles}
                  onSelectCountryFilter={handleCountryFilter}
                  onSelectHousingFilter={handleHousingFilter}
                  onSelectExplorationFilter={handleExplorationFilter}
                  onSelectIndustryFilter={handleIndustryFilter}
                  onSwitchToDeck={() => setCardSubView('deck')}
                  selectedCountry={filters.countries?.[0] || filters.country || null}
                  selectedHousing={filters.housingTypes?.[0] || filters.housingType || null}
                  selectedExploration={filters.explorations?.[0] || filters.exploration || null}
                  selectedIndustry={filters.industries?.[0] || filters.industry || null}
                  onOpenDetails={(p) => setSelectedDetailProfile(p)}
                  tabKey={currentTab}
                  activeSubView={cardSubView}
                />
              </Suspense>
            )}
          </div>
        )}

        {/* Tab 2: Daily Spotlight */}
        {currentTab === 'spotlight' && (
          <DailySpotlight
            profiles={allProfiles}
            currentUserName={userProfile?.fullName || currentUser.displayName}
            isGuest={isGuest}
            coffeeChatRecords={coffeeChatRecords}
            onOpenDetails={(p) => setSelectedDetailProfile(p)}
            onCoffeeChat={handleInitiateCoffeeChat}
            onOpenCoffeeChatNote={(p) => setCoffeeChatNoteProfile(p)}
            onGuestActionPrompt={(action) => setGuestPromptAction(action)}
          />
        )}

        {/* Tab 3: Coffee Chats Section (Hosts Chats Tracker & Cohort Calendar) */}
        {(currentTab === 'coffee_chats' || currentTab === 'calendar') && (
          <div className="w-full space-y-3.5">
            {/* Top Sub-navigation Segmented Control */}
            <div className="max-w-md mx-auto">
              <div className="flex p-1 bg-[#120B24]/90 backdrop-blur-2xl rounded-2xl border border-white/10 relative shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    if (isGuest) {
                      setGuestPromptAction('Coffee Chat Tracker');
                      return;
                    }
                    setCoffeeChatSubView('tracker');
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer relative z-10 flex items-center justify-center gap-1.5 ${
                    coffeeChatSubView === 'tracker' && currentTab !== 'calendar' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {coffeeChatSubView === 'tracker' && currentTab !== 'calendar' && (
                    <motion.div
                      layoutId="coffeeNavSubTabPill"
                      className="absolute inset-0 rounded-xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                      transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
                    />
                  )}
                  <Coffee className="w-3.5 h-3.5" />
                  <span className="relative z-10 whitespace-nowrap">Chats Tracker</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setCoffeeChatSubView('calendar');
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer relative z-10 flex items-center justify-center gap-1.5 ${
                    (coffeeChatSubView === 'calendar' || currentTab === 'calendar') ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {(coffeeChatSubView === 'calendar' || currentTab === 'calendar') && (
                    <motion.div
                      layoutId="coffeeNavSubTabPill"
                      className="absolute inset-0 rounded-xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                      transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
                    />
                  )}
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span className="relative z-10 whitespace-nowrap">Section Calendar</span>
                  {todayEventsCount > 0 && (
                    <span className="relative z-10 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                      {todayEventsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-view Content */}
            {(coffeeChatSubView === 'tracker' && currentTab !== 'calendar') ? (
              <Suspense fallback={<CardSkeletonLoader />}>
                <CoffeeChatHistoryView
                  profiles={allProfiles}
                  coffeeChatRecords={coffeeChatRecords}
                  onOpenDetails={(p) => setSelectedDetailProfile(p)}
                  onOpenNoteModal={(p) => setCoffeeChatNoteProfile(p)}
                  onInitiateCoffeeChat={handleInitiateCoffeeChat}
                  isGuest={isGuest}
                  incomingInvitations={incomingInvitations}
                  onAcceptInvitation={handleAcceptInvitation}
                  onOpenInAppChat={(p) => setChatRecipientProfile(p)}
                  onDeleteCoffeeChatRecord={handleDeleteCoffeeChatRecord}
                  onSaveNotes={handleSaveCoffeeChatNotes}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<CardSkeletonLoader />}>
                <CohortCalendarView
                  profiles={allProfiles}
                  coffeeChatRecords={coffeeChatRecords}
                  currentUserUid={currentUser?.uid}
                  currentUserName={userProfile?.fullName || currentUser?.displayName}
                  isGuest={isGuest}
                  onSelectProfile={(p) => setSelectedDetailProfile(p)}
                  onOpenCoffeeChats={() => setCoffeeChatSubView('tracker')}
                  onOpenCoffeeChatForProfile={(p) => setCoffeeChatNoteProfile(p)}
                  onGuestActionPrompt={(action) => setGuestPromptAction(action)}
                />
              </Suspense>
            )}
          </div>
        )}

        {/* Tab 4: My Card */}
        {currentTab === 'my_card' && (
          <MyProfileCard
            profile={userProfile ? { ...userProfile, isCurrentUser: true } : null}
            savedProfiles={allProfiles.filter((p) => savedUids.includes(p.uid))}
            isGuest={isGuest}
            onEditProfile={() => {
              if (isGuest) {
                setGuestPromptAction('Card Editor');
              } else {
                setIsEditingProfile(true);
              }
            }}
            onSignOut={handleSignOut}
            onOpenDetails={(p) => setSelectedDetailProfile(p)}
            onSignInRequested={handleSignOut}
            onGuestActionPrompt={(action) => setGuestPromptAction(action)}
            onDeleteProfile={handleDeleteProfile}
            isAdmin={isUserAdmin}
            onOpenAdminSeed={() => setShowAdminSeedModal(true)}
          />
        )}

      </main>

      {/* Expanded Classmate Detail Modal */}
      {selectedDetailProfile && (() => {
        const isSelf = Boolean(
          currentUser && !isGuest && (
            selectedDetailProfile.uid === currentUser.uid ||
            (userProfile && selectedDetailProfile.uid === userProfile.uid) ||
            (currentUser.email && selectedDetailProfile.email && currentUser.email.toLowerCase() === selectedDetailProfile.email.toLowerCase())
          )
        );

        return (
          <Suspense fallback={null}>
            <CardDetailModal
              profile={{
                ...selectedDetailProfile,
                isCurrentUser: isSelf,
              }}
              isSaved={savedUids.includes(selectedDetailProfile.uid)}
              coffeeChatRecord={coffeeChatRecords[selectedDetailProfile.uid]}
              onToggleSave={handleToggleSave}
              isGuest={isGuest}
              onClose={() => setSelectedDetailProfile(null)}
              onOpenCoffeeChatNote={(p) => setCoffeeChatNoteProfile(p)}
              onOpenInAppChat={(p) => {
                setSelectedDetailProfile(null);
                setChatRecipientProfile(p);
              }}
              onGuestActionPrompt={(action) => setGuestPromptAction(action)}
              onCoffeeChat={handleInitiateCoffeeChat}
              onEditProfile={isSelf ? () => {
                setSelectedDetailProfile(null);
                setIsEditingProfile(true);
              } : undefined}
            />
          </Suspense>
        );
      })()}

      {/* Dedicated Coffee Chat Composer Modal with Date, Time, Venue, and Templates */}
      {!isGuest && (
        <Suspense fallback={null}>
          <CoffeeChatInviteModal
            isOpen={Boolean(coffeeChatInviteModalRecipient)}
            recipient={coffeeChatInviteModalRecipient}
            currentUserProfile={userProfile}
            onClose={() => setCoffeeChatInviteModalRecipient(null)}
            onSendInvite={handleSendCoffeeChatInvite}
            onOpenInAppChat={(p) => {
              setCoffeeChatInviteModalRecipient(null);
              setChatRecipientProfile(p);
            }}
          />
        </Suspense>
      )}

      {/* Coffee Chat Verification Modal (Triggered on return to app, Never in guest mode) */}
      {!isGuest && (
        <CoffeeChatVerificationModal
          isOpen={Boolean(coffeeChatPendingProfile)}
          profile={coffeeChatPendingProfile}
          onConfirmSent={() => {
            if (coffeeChatPendingProfile) {
              handleConfirmCoffeeChatSent(coffeeChatPendingProfile);
            }
          }}
          onDidNotSend={() => {
            if (coffeeChatPendingProfile) {
              handleDeclineCoffeeChatSent(coffeeChatPendingProfile);
            }
          }}
          onDismiss={() => {
            if (coffeeChatPendingProfile) {
              handleDeclineCoffeeChatSent(coffeeChatPendingProfile);
            }
          }}
        />
      )}

      {/* Coffee Chat Note & Status Editor Modal (Never in guest mode) */}
      {!isGuest && coffeeChatNoteProfile && (
        <CoffeeChatNoteModal
          isOpen={Boolean(coffeeChatNoteProfile)}
          profile={coffeeChatNoteProfile}
          record={coffeeChatRecords[coffeeChatNoteProfile.uid] || null}
          onClose={() => setCoffeeChatNoteProfile(null)}
          onSave={(updates) => {
            handleSaveCoffeeChatNotes(coffeeChatNoteProfile.uid, updates);
          }}
          onDeleteRecord={() => {
            handleDeleteCoffeeChatRecord(coffeeChatNoteProfile.uid);
          }}
          onOpenInAppChat={(p) => {
            setCoffeeChatNoteProfile(null);
            setChatRecipientProfile(p);
          }}
        />
      )}

      {/* In-App Direct Chat Modal */}
      {!isGuest && (
        <Suspense fallback={null}>
          <InAppChatModal
            isOpen={Boolean(chatRecipientProfile)}
            recipient={chatRecipientProfile}
            currentUserProfile={userProfile}
            coffeeChatRecord={chatRecipientProfile ? coffeeChatRecords[chatRecipientProfile.uid] : undefined}
            onClose={() => setChatRecipientProfile(null)}
            onOpenCoffeeChatModal={(p) => {
              setChatRecipientProfile(null);
              setCoffeeChatInviteModalRecipient(p);
            }}
          />
        </Suspense>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        filters={filters}
        onFilterChange={setFilters}
        availableCountries={availableCountries}
        availableIndustries={availableIndustries}
        availableExplorations={availableExplorations}
      />

      {/* Guest Limitation Prompt Modal */}
      <GuestPromptModal
        isOpen={Boolean(guestPromptAction)}
        actionName={guestPromptAction || undefined}
        onClose={() => setGuestPromptAction(null)}
        onSignIn={handleSignOut}
      />

      {/* Admin Firestore Seeding & Roster Modal */}
      {showAdminSeedModal && (
        <Suspense fallback={null}>
          <AdminSeedModal
            isOpen={showAdminSeedModal}
            onClose={() => setShowAdminSeedModal(false)}
          />
        </Suspense>
      )}

      {/* Legal Privacy & Terms In-App Modal */}
      {legalModalTab && (
        <Suspense fallback={null}>
          <LegalModal
            isOpen={Boolean(legalModalTab)}
            activeTab={legalModalTab || 'privacy'}
            onTabChange={setLegalModalTab}
            onClose={() => setLegalModalTab(null)}
          />
        </Suspense>
      )}

      {/* In-App Toast Reminder for 24h+ pending coffee chats */}
      {!isGuest && activeCoffeeReminder && (
        <CoffeeChatReminderToast
          reminder={activeCoffeeReminder}
          onUpdateStatus={(rem) => {
            setActiveCoffeeReminder(null);
            setCoffeeChatNoteProfile(rem.profile);
          }}
          onDismiss={(rem) => {
            dismissCoffeeChatReminder(rem.profile.uid);
            setActiveCoffeeReminder(null);
          }}
        />
      )}

      {/* Floating Smooth Scroll-to-Top Quick Return Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 p-2.5 rounded-full bg-[#1A122E]/95 text-amber-400 border border-amber-400/40 shadow-[0_8px_28px_rgba(0,0,0,0.65)] backdrop-blur-xl hover:bg-[#251A40] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center ring-1 ring-white/10"
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-4 h-4 text-amber-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Persistent Bottom Navigation */}
      <Navigation
        currentTab={currentTab}
        cardSubView={cardSubView}
        onTabChange={handleTabChange}
        onSubViewChange={setCardSubView}
        userPhotoUrl={userProfile?.photoUrl?.trim() || currentUser.photoURL?.trim() || undefined}
        isGuest={isGuest}
        todayEventsCount={todayEventsCount}
        activeCoffeeChatsCount={
          Object.values(coffeeChatRecords).filter(
            (r) => r.status === 'request_sent' || r.status === 'scheduled'
          ).length
        }
      />

    </div>
  );
}


