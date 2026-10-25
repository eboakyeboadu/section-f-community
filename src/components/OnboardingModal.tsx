import React, { useState, useEffect } from 'react';
import { 
  User, 
  CheckCircle, 
  Camera, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Heart, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Upload, 
  Plus, 
  Trash2, 
  GraduationCap,
  Baby,
  Instagram,
  Linkedin,
  Phone,
  MessageCircle,
  Calendar,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
  LogOut,
  FileCheck,
  Search,
  UserPlus,
  ArrowRight,
  RefreshCw,
  Building2,
  AlertCircle,
  X,
  Languages
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Profile, HousingType, HousingBuilding, PrivacyLevel, ChildInfo, UnclaimedCard } from '../types';
import { uploadProfilePhoto, subscribeToUnclaimedCards, seedUnclaimedCards } from '../services/firebase';
import { getHighResGooglePhotoUrl } from '../services/imageUtils';
import { markUserPhotoUploaded } from '../services/photoReminderService';
import { DEFAULT_SEED_CARDS } from '../data/seedCardsData';
import { SectionFWordmark } from './SectionFWordmark';
import { 
  COUNTRIES_LIST, 
  HOUSING_OPTIONS, 
  POPULAR_CAREER_EXPLORATION_TAGS, 
  POPULAR_LANGUAGES,
  MONTHS_LIST, 
  DAYS_LIST,
  getDaysForMonth 
} from '../data/constants';

interface OnboardingModalProps {
  initialUid: string;
  initialEmail: string;
  initialName?: string;
  initialPhotoUrl?: string;
  onProfileSaved: (profile: Profile) => void;
  isEditing?: boolean;
  existingProfile?: Profile | null;
  onCloseEdit?: () => void;
  onDeleteProfile?: () => Promise<void> | void;
  onSignOut?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialUid,
  initialEmail,
  initialName = '',
  initialPhotoUrl = '',
  onProfileSaved,
  isEditing = false,
  existingProfile = null,
  onCloseEdit,
  onDeleteProfile,
  onSignOut
}) => {
  // Onboarding Step Flow:
  // 'welcome_choice' -> asks "Did you already fill out the Section F Cards Google Form for the PDF profiles?"
  // 'search_pdf'      -> Path A: searchable dropdown of unclaimed_cards
  // 'form'            -> Profile form (either pre-populated from claimed card or empty for new user)
  type OnboardingFlowState = 'welcome_choice' | 'search_pdf' | 'form';
  const [flowState, setFlowState] = useState<OnboardingFlowState>(isEditing ? 'form' : 'welcome_choice');
  const [unclaimedCards, setUnclaimedCards] = useState<UnclaimedCard[]>([]);
  const [selectedUnclaimedCard, setSelectedUnclaimedCard] = useState<UnclaimedCard | null>(null);
  const [nameSearchQuery, setNameSearchQuery] = useState<string>('');
  const [isSeedingRoster, setIsSeedingRoster] = useState<boolean>(false);

  // Subscribe to unclaimed cards from Firestore
  useEffect(() => {
    if (isEditing) return;
    const unsub = subscribeToUnclaimedCards((cards) => {
      setUnclaimedCards(cards);
      // Auto-seed if collection is completely empty on initial launch
      if (cards.length === 0 && !isSeedingRoster) {
        setIsSeedingRoster(true);
        seedUnclaimedCards(DEFAULT_SEED_CARDS)
          .catch((err) => console.warn('Auto seed notice:', err))
          .finally(() => setIsSeedingRoster(false));
      }
    });
    return () => unsub();
  }, [isEditing]);

  const [openSection, setOpenSection] = useState<string>('core');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isUploadingMain, setIsUploadingMain] = useState<boolean>(false);
  const [isUploadingExtra, setIsUploadingExtra] = useState<boolean>(false);
  const [customTagInput, setCustomTagInput] = useState<string>('');

  // Extract initial Birthday Month & Day
  const getInitialBirthdayParts = () => {
    if (existingProfile?.birthdayMonth && existingProfile?.birthdayDay) {
      return { month: existingProfile.birthdayMonth, day: existingProfile.birthdayDay };
    }
    if (existingProfile?.birthday) {
      const parts = existingProfile.birthday.trim().split(' ');
      if (parts.length === 2 && MONTHS_LIST.includes(parts[0])) {
        return { month: parts[0], day: parts[1] };
      }
    }
    return { month: '', day: '' };
  };

  const initialBday = getInitialBirthdayParts();

  // Form State - Core Identity & Photos (Up to 3 total)
  const [fullName, setFullName] = useState<string>(existingProfile?.fullName || initialName || '');
  const [nickname, setNickname] = useState<string>(existingProfile?.nickname || '');
  const [pronunciation, setPronunciation] = useState<string>(existingProfile?.pronunciation || '');
  const [email, setEmail] = useState<string>(existingProfile?.email || initialEmail || '');
  const [phone, setPhone] = useState<string>(existingProfile?.phone || existingProfile?.whatsapp || '');
  const [whatsapp, setWhatsapp] = useState<string>(existingProfile?.whatsapp || '');
  const [whatsappMode, setWhatsappMode] = useState<'same' | 'custom' | 'none'>(() => {
    if (existingProfile?.notOnWhatsApp) return 'none';
    if (existingProfile?.whatsapp && existingProfile?.phone && existingProfile.whatsapp.trim() !== existingProfile.phone.trim()) {
      return 'custom';
    }
    return 'same';
  });
  const [instagramHandle, setInstagramHandle] = useState<string>(existingProfile?.instagramHandle || '');
  const [linkedinUrl, setLinkedinUrl] = useState<string>(existingProfile?.linkedinUrl || '');
  
  // Birthday Month & Day Dropdown state
  const [birthdayMonth, setBirthdayMonth] = useState<string>(initialBday.month);
  const [birthdayDay, setBirthdayDay] = useState<string>(initialBday.day);
  
  // Main photo + Up to 2 additional photos
  const [photoUrl, setPhotoUrl] = useState<string>(
    getHighResGooglePhotoUrl(existingProfile?.photoUrl || initialPhotoUrl || '')
  );
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>(
    existingProfile?.additionalPhotos || []
  );
  
  // Geography & Housing
  const [homeCountry, setHomeCountry] = useState<string>(existingProfile?.homeCountry || 'United States');
  const [countryCode, setCountryCode] = useState<string>(existingProfile?.countryCode || 'US');
  const [hometown, setHometown] = useState<string>(existingProfile?.hometown || '');
  
  // Housing Building & Detail
  const [selectedBuilding, setSelectedBuilding] = useState<HousingBuilding>(
    existingProfile?.housingBuilding || 'Mellon Hall'
  );
  const [housingUnit, setHousingUnit] = useState<string>(
    existingProfile?.housingDetail ? existingProfile.housingDetail.replace(/^(Chase|Gallatin|Hamilton|McCulloch|Mellon|Morris|One Western Avenue|Peabody Terrace|Soldiers Field Park|100 South Campus Drive|Off-Campus)\s*/i, '').trim() : ''
  );
  const [offCampusAddress, setOffCampusAddress] = useState<string>(
    existingProfile?.housingBuilding === 'Off-Campus' ? existingProfile?.housingDetail : ''
  );

  // Background & Career
  const [preHbsCompany, setPreHbsCompany] = useState<string>(existingProfile?.preHbsCompany || '');
  const [preHbsRole, setPreHbsRole] = useState<string>(existingProfile?.preHbsRole || '');
  const [preHbsIndustry, setPreHbsIndustry] = useState<string>(existingProfile?.preHbsIndustry || '');
  const [companyUrl, setCompanyUrl] = useState<string>(existingProfile?.companyUrl || '');
  
  // Education - Undergrad
  const [undergradSchool, setUndergradSchool] = useState<string>(existingProfile?.undergradSchool || '');
  const [undergradDegree, setUndergradDegree] = useState<string>(existingProfile?.undergradDegree || '');
  
  // Education - Graduate
  const [hasGraduateDegree, setHasGraduateDegree] = useState<boolean>(existingProfile?.hasGraduateDegree || false);
  const [graduateSchool, setGraduateSchool] = useState<string>(existingProfile?.graduateSchool || '');
  const [graduateDegree, setGraduateDegree] = useState<string>(existingProfile?.graduateDegree || '');

  const [postHbsExploration, setPostHbsExploration] = useState<string[]>(
    existingProfile?.postHbsExploration || []
  );
  const [languages, setLanguages] = useState<string[]>(
    existingProfile?.languages || []
  );
  const [langInput, setLangInput] = useState<string>('');
  const [countriesLived, setCountriesLived] = useState<string>(existingProfile?.countriesLived || '');
  const [funFact, setFunFact] = useState<string>(existingProfile?.funFact || '');
  const [hobbies, setHobbies] = useState<string>(existingProfile?.hobbies || '');

  // Social & Payment
  const [venmoHandle, setVenmoHandle] = useState<string>(existingProfile?.venmoHandle || '');
  const [zelleInfo, setZelleInfo] = useState<string>(existingProfile?.zelleInfo || '');

  // Partner Page
  const [hasPartner, setHasPartner] = useState<boolean>(existingProfile?.hasPartner || false);
  const [partnerName, setPartnerName] = useState<string>(existingProfile?.partner?.name || '');
  const [partnerAffiliation, setPartnerAffiliation] = useState<string>(existingProfile?.partner?.affiliation || '');
  const [partnerContact, setPartnerContact] = useState<string>(existingProfile?.partner?.contact || '');

  // Children State - Separate Name & Years / Age
  const [hasChildren, setHasChildren] = useState<boolean>(existingProfile?.hasChildren || false);
  const [childrenList, setChildrenList] = useState<ChildInfo[]>(
    existingProfile?.children && existingProfile.children.length > 0
      ? existingProfile.children
      : [{ name: '', ageOrYear: '' }]
  );

  // Privacy
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(existingProfile?.privacyLevel || 'share_all');
  const [formError, setFormError] = useState<string | null>(null);

  const toggleSection = (sec: string) => {
    setOpenSection(openSection === sec ? '' : sec);
  };

  const handleCountryChange = (selectedCountryName: string) => {
    setHomeCountry(selectedCountryName);
    const match = COUNTRIES_LIST.find(c => c.name === selectedCountryName);
    if (match) {
      setCountryCode(match.code);
    }
  };

  // Main Photo Upload
  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMain(true);
      const url = await uploadProfilePhoto(file, initialUid);
      setPhotoUrl(url);
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      setIsUploadingMain(false);
      e.target.value = '';
    }
  };

  // Extra Photo Upload (Up to 2 extra)
  const handleExtraPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (additionalPhotos.length >= 2) {
      setFormError('You can upload up to 2 additional photos (3 photos total).');
      return;
    }

    try {
      setIsUploadingExtra(true);
      const url = await uploadProfilePhoto(file, `${initialUid}_extra_${Date.now()}`);
      setAdditionalPhotos([...additionalPhotos, url]);
    } catch (err) {
      console.error('Error uploading extra photo:', err);
    } finally {
      setIsUploadingExtra(false);
      e.target.value = '';
    }
  };

  const removeExtraPhoto = (index: number) => {
    setAdditionalPhotos(additionalPhotos.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (postHbsExploration.includes(trimmed)) {
      setPostHbsExploration(postHbsExploration.filter(t => t !== trimmed));
    } else {
      if (postHbsExploration.length < 8) {
        setPostHbsExploration([...postHbsExploration, trimmed]);
      } else {
        setFormError('You can select up to 8 career explorations.');
      }
    }
  };

  const removeTag = (tag: string) => {
    setPostHbsExploration(postHbsExploration.filter(t => t !== tag));
  };

  const addCustomTag = () => {
    const raw = customTagInput.trim();
    if (!raw) return;
    const parts = raw.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return;

    let updated = [...postHbsExploration];
    for (const part of parts) {
      if (updated.length >= 8) {
        setFormError('You can select up to 8 career explorations.');
        break;
      }
      const alreadyHas = updated.some(t => t.toLowerCase() === part.toLowerCase());
      if (!alreadyHas) {
        updated.push(part);
      }
    }
    setPostHbsExploration(updated);
    setCustomTagInput('');
  };

  const toggleLanguage = (lang: string) => {
    const trimmed = lang.trim();
    if (!trimmed) return;
    if (languages.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
      setLanguages(languages.filter(l => l.toLowerCase() !== trimmed.toLowerCase()));
    } else {
      setLanguages([...languages, trimmed]);
    }
  };

  const addLanguage = () => {
    const raw = langInput.trim();
    if (!raw) return;
    const parts = raw.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return;

    let updated = [...languages];
    for (const part of parts) {
      const alreadyHas = updated.some(l => l.toLowerCase() === part.toLowerCase());
      if (!alreadyHas) {
        updated.push(part);
      }
    }
    setLanguages(updated);
    setLangInput('');
  };

  const removeLanguage = (lang: string) => {
    setLanguages(languages.filter(l => l.toLowerCase() !== lang.toLowerCase()));
  };

  // Children handling
  const handleChildChange = (index: number, field: keyof ChildInfo, value: string) => {
    const updated = [...childrenList];
    updated[index] = { ...updated[index], [field]: value };
    setChildrenList(updated);
  };

  const addChildRow = () => {
    setChildrenList([...childrenList, { name: '', ageOrYear: '' }]);
  };

  const removeChildRow = (index: number) => {
    if (childrenList.length === 1) {
      setChildrenList([{ name: '', ageOrYear: '' }]);
    } else {
      setChildrenList(childrenList.filter((_, i) => i !== index));
    }
  };

  // Source cards: use unclaimedCards if loaded from Firestore, otherwise fallback to DEFAULT_SEED_CARDS
  const sourceCards: UnclaimedCard[] = unclaimedCards.length > 0
    ? unclaimedCards
    : (DEFAULT_SEED_CARDS as UnclaimedCard[]);

  // Filter available unclaimed cards by search query
  const filteredUnclaimedCards = sourceCards.filter((card) => {
    if (card.claimed) return false;
    if (!nameSearchQuery.trim()) return true;
    const q = nameSearchQuery.toLowerCase().trim();
    const matchesName = card.fullName?.toLowerCase().includes(q);
    const matchesNick = card.nickname?.toLowerCase().includes(q);
    const matchesCompany = card.preHbsCompany?.toLowerCase().includes(q);
    return Boolean(matchesName || matchesNick || matchesCompany);
  });

  const handleSelectCard = (card: UnclaimedCard) => {
    setSelectedUnclaimedCard(card);
    if (card.fullName) setFullName(card.fullName);
    if (card.nickname) setNickname(card.nickname);
    if (card.pronunciation) setPronunciation(card.pronunciation);
    if (card.hometown) setHometown(card.hometown);
    if (card.homeCountry) {
      setHomeCountry(card.homeCountry);
      const match = COUNTRIES_LIST.find((c) => c.name.toLowerCase() === card.homeCountry?.toLowerCase());
      if (match) setCountryCode(match.code);
    }
    if (card.preHbsCompany) setPreHbsCompany(card.preHbsCompany);
    if (card.preHbsRole) setPreHbsRole(card.preHbsRole);
    if (card.companyUrl) setCompanyUrl(card.companyUrl);

    if (card.housing) {
      const hLower = card.housing.toLowerCase();
      if (hLower.includes('off-campus') || hLower.includes('off campus')) {
        setSelectedBuilding('Off-Campus');
        setOffCampusAddress(card.housing);
      } else {
        const found = HOUSING_OPTIONS.find((opt) => hLower.includes(opt.building.toLowerCase()));
        if (found) {
          setSelectedBuilding(found.building);
        }
        setHousingUnit(card.housing);
      }
    }

    if (card.funFact) setFunFact(card.funFact);
    if (card.hobbies) setHobbies(card.hobbies);
    if (card.venmo) setVenmoHandle(card.venmo);
    if (card.zelle) setZelleInfo(card.zelle);
    if (card.email) setEmail(card.email);
    const cardPhone = card.phone || card.whatsapp || '';
    if (cardPhone) setPhone(cardPhone);
    if (card.notOnWhatsApp) {
      setWhatsappMode('none');
      setWhatsapp('');
    } else if (card.whatsapp) {
      setWhatsapp(card.whatsapp);
      if (card.phone && card.whatsapp.trim() !== card.phone.trim()) {
        setWhatsappMode('custom');
      } else {
        setWhatsappMode('same');
      }
    } else if (cardPhone) {
      setWhatsapp(cardPhone);
      setWhatsappMode('same');
    }

    if (card.birthday) {
      const parts = card.birthday.trim().split(' ');
      if (parts.length === 2 && MONTHS_LIST.includes(parts[0])) {
        setBirthdayMonth(parts[0]);
        setBirthdayDay(parts[1]);
      } else if (card.birthday.includes('/')) {
        const [m, d] = card.birthday.split('/');
        const monthNum = parseInt(m, 10);
        if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
          setBirthdayMonth(MONTHS_LIST[monthNum - 1]);
          setBirthdayDay(d);
        }
      }
    }

    if (Array.isArray(card.exploringInterests) && card.exploringInterests.length > 0) {
      setPostHbsExploration(card.exploringInterests);
    } else if (typeof card.exploringInterests === 'string' && card.exploringInterests) {
      setPostHbsExploration((card.exploringInterests as string).split(',').map((s) => s.trim()));
    }

    if (Array.isArray(card.languages) && card.languages.length > 0) {
      setLanguages(card.languages);
    } else if (typeof card.languages === 'string' && card.languages) {
      setLanguages((card.languages as string).split(',').map((s) => s.trim()).filter(Boolean));
    }

    // Set open section to core so the user immediately sees the photo upload requirement!
    setOpenSection('core');
    setFlowState('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Mandatory Full Name
    if (!fullName.trim()) {
      setOpenSection('core');
      setFormError('Please enter your full name.');
      return;
    }

    // 2. Mandatory Profile Picture
    if (!photoUrl.trim()) {
      setOpenSection('core');
      setFormError('Please upload a profile photo so your classmates can recognize you.');
      return;
    }

    // 3. Mandatory Home Country & Hometown
    if (!homeCountry.trim() || !hometown.trim()) {
      setOpenSection('background');
      setFormError('Please provide your Home Country and Hometown / City.');
      return;
    }

    // 4. Mandatory Pre-HBS Company & Role
    if (!preHbsCompany.trim() || !preHbsRole.trim()) {
      setOpenSection('career');
      setFormError('Please provide your Pre-HBS Company and Role.');
      return;
    }

    // 5. Mandatory Partner Name if partner toggle is ON
    if (hasPartner && !partnerName.trim()) {
      setOpenSection('partner');
      setFormError('Since you selected having a partner or spouse, please provide their name.');
      return;
    }

    // 6. Mandatory Child Name for each child if children toggle is ON
    if (hasChildren) {
      if (childrenList.length === 0 || childrenList.some((c) => !c.name.trim())) {
        setOpenSection('partner');
        setFormError('Since you selected having children, please provide the name for each child.');
        return;
      }
    }

    // Calculate Housing Detail string
    const buildingObj = HOUSING_OPTIONS.find(h => h.building === selectedBuilding);
    const housingType: HousingType = buildingObj ? buildingObj.type : (selectedBuilding === 'Off-Campus' ? 'off_campus' : 'dorm');
    
    let compiledHousingDetail = '';
    if (selectedBuilding === 'Off-Campus') {
      compiledHousingDetail = offCampusAddress.trim() || 'Off-Campus (Cambridge/Boston)';
    } else {
      compiledHousingDetail = housingUnit.trim() ? `${selectedBuilding} ${housingUnit.trim()}` : selectedBuilding;
    }

    // Clean Instagram Handle
    let cleanInstagram = instagramHandle.trim();
    if (cleanInstagram && !cleanInstagram.startsWith('@') && !cleanInstagram.includes('/')) {
      cleanInstagram = `@${cleanInstagram}`;
    }

    // Format Birthday string (Month Day)
    let formattedBirthday: string | undefined = undefined;
    if (birthdayMonth && birthdayDay) {
      formattedBirthday = `${birthdayMonth} ${birthdayDay}`;
    } else if (birthdayMonth) {
      formattedBirthday = birthdayMonth;
    }

    // Format Children details
    const validChildren = childrenList.filter(c => c.name.trim() || c.ageOrYear.trim());
    let compiledChildrenDetails: string | undefined = undefined;
    if (hasChildren && validChildren.length > 0) {
      compiledChildrenDetails = validChildren
        .map(c => {
          if (c.name.trim() && c.ageOrYear.trim()) {
            return `${c.name.trim()} (${c.ageOrYear.trim()})`;
          }
          return c.name.trim() || c.ageOrYear.trim();
        })
        .join(', ');
    }

    setIsSaving(true);
    const profile: Profile = {
      uid: initialUid,
      authEmail: initialEmail,
      unclaimedCardId: selectedUnclaimedCard?.id,
      fullName: fullName.trim(),
      nickname: nickname.trim() || undefined,
      pronunciation: pronunciation.trim() || undefined,
      email: email.trim(),
      phone: phone.trim() || undefined,
      whatsapp: whatsappMode === 'none'
        ? undefined
        : (whatsappMode === 'same' ? (phone.trim() || undefined) : (whatsapp.trim() || undefined)),
      notOnWhatsApp: whatsappMode === 'none',
      instagramHandle: cleanInstagram || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      birthday: formattedBirthday,
      birthdayMonth: birthdayMonth || undefined,
      birthdayDay: birthdayDay || undefined,
      photoUrl: photoUrl.trim() || '',
      additionalPhotos: additionalPhotos.length > 0 ? additionalPhotos : undefined,
      homeCountry: homeCountry.trim() || 'United States',
      countryCode: countryCode || 'US',
      hometown: hometown.trim(),
      housingBuilding: selectedBuilding,
      housingType: housingType,
      housingDetail: compiledHousingDetail,
      preHbsCompany: preHbsCompany.trim(),
      preHbsRole: preHbsRole.trim(),
      preHbsIndustry: preHbsIndustry.trim(),
      companyUrl: companyUrl.trim() || undefined,
      undergradSchool: undergradSchool.trim(),
      undergradDegree: undergradDegree.trim() || undefined,
      hasGraduateDegree: hasGraduateDegree,
      graduateSchool: hasGraduateDegree && graduateSchool.trim() ? graduateSchool.trim() : undefined,
      graduateDegree: hasGraduateDegree && graduateDegree.trim() ? graduateDegree.trim() : undefined,
      postHbsExploration: postHbsExploration,
      languages: languages,
      countriesLived: countriesLived.trim(),
      funFact: funFact.trim() || undefined,
      hobbies: hobbies.trim(),
      venmoHandle: venmoHandle.trim() || undefined,
      zelleInfo: zelleInfo.trim() || undefined,
      hasPartner: hasPartner,
      partner: hasPartner ? {
        name: partnerName.trim() || undefined,
        affiliation: partnerAffiliation.trim() || undefined,
        contact: partnerContact.trim() || undefined,
      } : undefined,
      hasChildren: hasChildren,
      children: hasChildren && validChildren.length > 0 ? validChildren : undefined,
      childrenDetails: compiledChildrenDetails,
      privacyLevel: privacyLevel,
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onProfileSaved(profile);
      if (profile.photoUrl && profile.photoUrl.trim() !== '') {
        markUserPhotoUploaded(profile.uid).catch(() => {});
      }
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0B0813]/95 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4">
      <div className="w-full max-w-lg bg-[#171226] border border-[#2E244A] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#581C87] via-[#6B21A8] to-[#7E22CE] p-3.5 sm:p-4 text-white flex items-center justify-between border-b border-[#F59E0B]/30 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-10 flex items-center justify-center filter drop-shadow">
              <SectionFWordmark className="w-full h-full" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base tracking-tight leading-tight">
                {isEditing 
                  ? 'Edit Your Section F Card' 
                  : flowState === 'welcome_choice' 
                  ? 'Welcome to Section F' 
                  : flowState === 'search_pdf' 
                  ? 'Find Your Section F Card' 
                  : selectedUnclaimedCard 
                  ? `Review Card: ${selectedUnclaimedCard.fullName}` 
                  : 'Create Your Section F Card'}
              </h2>
              <p className="text-[11px] text-purple-200">
                {isEditing 
                  ? 'Update your profile card' 
                  : flowState === 'welcome_choice' 
                  ? 'Onboarding & Card Setup' 
                  : flowState === 'search_pdf' 
                  ? 'Search your name from the PDF directory' 
                  : selectedUnclaimedCard 
                  ? 'Upload your photo(s) & review your details' 
                  : 'Complete your card to enter the section deck'}
              </p>
            </div>
          </div>
          {isEditing && onCloseEdit ? (
            <button
              type="button"
              onClick={onCloseEdit}
              className="text-xs text-purple-200 hover:text-white px-3 py-1.5 rounded-xl bg-black/30 cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </button>
          ) : flowState === 'search_pdf' ? (
            <button
              type="button"
              onClick={() => setFlowState('welcome_choice')}
              className="text-xs font-semibold text-purple-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : flowState === 'form' && !isEditing ? (
            <button
              type="button"
              onClick={() => setFlowState(selectedUnclaimedCard ? 'search_pdf' : 'welcome_choice')}
              className="text-xs font-semibold text-purple-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs font-semibold text-purple-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
              title="Return to sign-in / sign-up screen"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : null}
        </div>

        {/* Modal Content Area */}
        {flowState === 'welcome_choice' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-center">
            <div className="py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#581C87] to-[#F59E0B]/30 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B] shadow-lg mb-3">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Welcome to Section F Cards!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm mx-auto">
                Did you already fill out the Section F Cards Google Form for the PDF profiles?
              </p>
            </div>

            <div className="space-y-3 pt-1 text-left">
              {/* Option A: Yes, I filled it out */}
              <button
                type="button"
                onClick={() => setFlowState('search_pdf')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#1E1436] to-[#2D1B4E] hover:from-[#2A1B4E] hover:to-[#3D256A] border-2 border-[#F59E0B]/50 hover:border-[#F59E0B] transition-all cursor-pointer group shadow-lg active:scale-[0.99]"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white group-hover:text-[#F59E0B] transition-colors">
                        Yes, I filled it out
                      </h4>
                      <ArrowRight className="w-4 h-4 text-[#F59E0B] opacity-75 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="mt-2.5 inline-flex items-center space-x-1.5 text-[11px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2.5 py-1 rounded-lg">
                      <CheckCircle className="w-3 h-3" />
                      <span>Search & Claim Pre-filled Card</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Option B: No, I'm new */}
              <button
                type="button"
                onClick={() => {
                  setSelectedUnclaimedCard(null);
                  setFlowState('form');
                }}
                className="w-full p-4 rounded-2xl bg-[#171226] hover:bg-[#201836] border border-[#2E244A] hover:border-purple-400/50 transition-all cursor-pointer group shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                        No, I'm new
                      </h4>
                      <ArrowRight className="w-4 h-4 text-purple-400 opacity-75 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : flowState === 'search_pdf' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Search your name as it appears in the PDF
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select your name to claim your Section F card and auto-fill your profile.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={nameSearchQuery}
                onChange={(e) => setNameSearchQuery(e.target.value)}
                placeholder="Search your name as it appears in the PDF..."
                className="w-full bg-[#0B0813] border border-[#3A2D5C] focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] text-white text-xs sm:text-sm pl-9 pr-8 py-2.5 rounded-xl placeholder-slate-500 transition-all outline-none shadow-inner"
                autoFocus
              />
              {nameSearchQuery && (
                <button
                  type="button"
                  onClick={() => setNameSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search Results List */}
            <div className="space-y-2 max-h-[46dvh] overflow-y-auto pr-1">
              {filteredUnclaimedCards.length > 0 ? (
                filteredUnclaimedCards.map((card) => (
                  <div
                    key={card.id || card.fullName}
                    onClick={() => handleSelectCard(card)}
                    className="p-3.5 rounded-xl bg-[#0B0813]/70 hover:bg-[#1E1436] border border-[#2E244A] hover:border-[#F59E0B]/60 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs sm:text-sm text-white group-hover:text-[#F59E0B] transition-colors truncate">
                          {card.fullName}
                        </span>
                        {card.nickname && (
                          <span className="text-[10px] text-purple-300 bg-purple-900/40 px-1.5 py-0.5 rounded border border-purple-500/30">
                            "{card.nickname}"
                          </span>
                        )}
                        {card.pronunciation && (
                          <span className="text-[10px] text-slate-400 italic">
                            ({card.pronunciation})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {[card.preHbsRole, card.preHbsCompany].filter(Boolean).join(' at ') || [card.hometown, card.homeCountry].filter(Boolean).join(', ')}
                      </div>
                      {card.housing && (
                        <div className="text-[10px] text-amber-300/80 mt-0.5 flex items-center space-x-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{card.housing}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B] group-hover:bg-[#F59E0B] group-hover:text-black font-semibold text-xs transition-colors flex items-center space-x-1"
                    >
                      <span>Claim</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center bg-[#0B0813]/40 border border-dashed border-[#2E244A] rounded-xl space-y-2">
                  <p className="text-xs text-slate-400">
                    {nameSearchQuery ? `No matching unclaimed cards found for "${nameSearchQuery}".` : 'No cards available.'}
                  </p>
                  {unclaimedCards.length === 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSeedingRoster(true);
                        await seedUnclaimedCards(DEFAULT_SEED_CARDS);
                        setIsSeedingRoster(false);
                      }}
                      disabled={isSeedingRoster}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      {isSeedingRoster ? 'Loading cards...' : 'Click to load 32 Section F directory cards'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Path A Item 4: Can't find your name? Scratch option */}
            <div className="pt-2 border-t border-[#2E244A] text-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedUnclaimedCard(null);
                  setFlowState('form');
                }}
                className="text-xs text-purple-300 hover:text-[#F59E0B] hover:underline cursor-pointer transition-colors"
              >
                Can't find your name? Click here to create a new profile from scratch.
              </button>
            </div>
          </div>
        ) : (
          /* flowState === 'form' - renders form */
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5">
            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              {/* Form Validation Error Banner */}
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-xl">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-semibold leading-snug">{formError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="p-1 text-rose-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              {/* Claiming Banner if card was selected from PDF */}
              {selectedUnclaimedCard && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-950/50 to-purple-950/50 border border-emerald-600/50 rounded-2xl flex items-start justify-between space-x-3">
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-200">
                      <p className="font-semibold text-emerald-300">
                        Claiming Card: {selectedUnclaimedCard.fullName}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Your PDF bio and career data are pre-filled below. Please upload your photo(s) and review the fields before entering the deck!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFlowState('search_pdf')}
                    className="text-[11px] text-purple-300 hover:text-white underline shrink-0 cursor-pointer"
                  >
                    Change Card
                  </button>
                </div>
              )}

              {/* Accordion 1: Core Identity & Photos */}
              <div className="border border-[#2E244A] rounded-2xl overflow-hidden bg-[#0B0813]/60 shadow-md">
                <button
                  type="button"
                  onClick={() => toggleSection('core')}
                  className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-slate-200 bg-[#171226]/80 cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <User className="w-4 h-4 text-[#F59E0B]" />
                    <span>1. Core Identity & Photos (Up to 3)</span>
                  </div>
                  {openSection === 'core' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {openSection === 'core' && (
                  <div className="p-3.5 sm:p-4 space-y-4 border-t border-[#2E244A]">
                    
                    {/* Prompt to upload photo */}
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs flex items-center space-x-2.5">
                      <Camera className="w-4 h-4 shrink-0 text-[#F59E0B]" />
                      <p className="font-semibold text-white text-xs sm:text-sm">📸 Add your card photos</p>
                    </div>

                    {/* Photo Gallery Grid (Main Photo + Up to 2 Extra Photos) */}
                    <div className="bg-[#171226] p-3.5 rounded-2xl border border-[#2E244A] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ImageIcon className="w-4 h-4 text-[#F59E0B]" />
                          <span className="text-xs font-bold text-slate-200">
                            Profile Photos ({1 + additionalPhotos.length}/3)
                          </span>
                        </div>
                        <span className="text-[10px] text-purple-300">
                          Main headshot + 2 optional photos
                        </span>
                      </div>

                    {/* Photos Row */}
                    <div className="grid grid-cols-3 gap-2.5">
                      
                      {/* Photo 1: Main Headshot */}
                      <div className="flex flex-col items-center space-y-1.5">
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-[#F59E0B] shadow-md group bg-[#0B0813]">
                          {photoUrl && photoUrl.trim() !== '' ? (
                            <img
                              src={photoUrl}
                              alt="Main Profile Headshot"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1c1530] to-[#0B0813] text-slate-400 p-2">
                              <User className="w-7 h-7 text-slate-500 mb-1" />
                              <span className="text-[9px] font-semibold text-slate-400">No Photo</span>
                            </div>
                          )}
                          {isUploadingMain ? (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
                              <Loader2 className="w-5 h-5 animate-spin text-[#F59E0B] mb-1" />
                              <span className="text-[9px] font-bold">Uploading...</span>
                            </div>
                          ) : (
                            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                              <Camera className="w-4 h-4 text-[#F59E0B] mb-0.5" />
                              <span className="text-[9px] font-semibold">{photoUrl ? 'Change' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleMainPhotoUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                          {photoUrl && !isUploadingMain && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoUrl('');
                              }}
                              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white shadow-md transition-colors cursor-pointer z-10"
                              title="Remove profile picture"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <div className="absolute bottom-1 left-1 bg-[#581C87]/90 text-[#F59E0B] text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                            {photoUrl && photoUrl.includes('googleusercontent.com') ? 'Google HD ★' : 'Main *'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="text-[10px] text-[#F59E0B] hover:text-amber-300 font-semibold cursor-pointer flex items-center space-x-1">
                            <Upload className="w-2.5 h-2.5" />
                            <span>{photoUrl ? 'Change' : 'Upload'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleMainPhotoUpload}
                              className="hidden"
                            />
                          </label>
                          {photoUrl && (
                            <button
                              type="button"
                              onClick={() => setPhotoUrl('')}
                              className="text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Photo 2 */}
                      {additionalPhotos.length > 0 && additionalPhotos[0] && additionalPhotos[0].trim() !== '' ? (
                        <div className="flex flex-col items-center space-y-1.5">
                          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-purple-500/50 shadow-md group bg-[#0B0813]">
                            <img
                              src={additionalPhotos[0]}
                              alt="Photo 2"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeExtraPhoto(0)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-700 transition-colors shadow cursor-pointer"
                              title="Remove Photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/70 text-slate-200 text-[8px] font-semibold px-1.5 py-0.2 rounded">
                              Photo 2
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExtraPhoto(0)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <label className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#2E244A] hover:border-[#F59E0B]/60 bg-[#0B0813]/60 flex flex-col items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-all">
                            {isUploadingExtra ? (
                              <Loader2 className="w-5 h-5 animate-spin text-[#F59E0B]" />
                            ) : (
                              <>
                                <Plus className="w-5 h-5 text-[#F59E0B] mb-1" />
                                <span className="text-[10px] font-semibold text-center px-1">Add Photo 2</span>
                                <span className="text-[8px] text-slate-500">Family/Travel</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleExtraPhotoUpload}
                              className="hidden"
                              disabled={isUploadingExtra}
                            />
                          </label>
                        </div>
                      )}

                      {/* Photo 3 */}
                      {additionalPhotos.length > 1 && additionalPhotos[1] && additionalPhotos[1].trim() !== '' ? (
                        <div className="flex flex-col items-center space-y-1.5">
                          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-purple-500/50 shadow-md group bg-[#0B0813]">
                            <img
                              src={additionalPhotos[1]}
                              alt="Photo 3"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeExtraPhoto(1)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-700 transition-colors shadow cursor-pointer"
                              title="Remove Photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/70 text-slate-200 text-[8px] font-semibold px-1.5 py-0.2 rounded">
                              Photo 3
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExtraPhoto(1)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <label className={`w-full aspect-square rounded-2xl border-2 border-dashed border-[#2E244A] bg-[#0B0813]/60 flex flex-col items-center justify-center transition-all ${
                            additionalPhotos.length === 1 
                              ? 'hover:border-[#F59E0B]/60 text-slate-400 hover:text-white cursor-pointer' 
                              : 'opacity-50 cursor-not-allowed text-slate-600'
                          }`}>
                            {isUploadingExtra && additionalPhotos.length === 1 ? (
                              <Loader2 className="w-5 h-5 animate-spin text-[#F59E0B]" />
                            ) : (
                              <>
                                <Plus className="w-5 h-5 text-slate-400 mb-1" />
                                <span className="text-[10px] font-semibold text-center px-1">Add Photo 3</span>
                                <span className="text-[8px] text-slate-500">Hobbies/Pet</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleExtraPhotoUpload}
                              className="hidden"
                              disabled={additionalPhotos.length === 0 || isUploadingExtra}
                            />
                          </label>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Amara Okafor"
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>

                  {/* Nickname */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Amara"
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>

                  {/* Name Pronunciation */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Name Pronunciation Phonetics (Optional)
                    </label>
                    <input
                      type="text"
                      value={pronunciation}
                      onChange={(e) => setPronunciation(e.target.value)}
                      placeholder='e.g. ah-MAH-rah oh-KAH-for'
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none placeholder-slate-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.morgan@email.com"
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>

                  {/* Birthday Month & Day Dropdown Menu */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Birthday (Month & Day)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Month Dropdown */}
                      <select
                        value={birthdayMonth}
                        onChange={(e) => {
                          const newMonth = e.target.value;
                          setBirthdayMonth(newMonth);
                          // Auto-adjust day if selected day exceeds new month limit (e.g. 31 -> 29 in Feb)
                          if (birthdayDay && newMonth) {
                            const validDays = getDaysForMonth(newMonth);
                            const max = parseInt(validDays[validDays.length - 1], 10);
                            const current = parseInt(birthdayDay, 10);
                            if (!isNaN(current) && current > max) {
                              setBirthdayDay(String(max));
                            }
                          }
                        }}
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none cursor-pointer"
                      >
                        <option value="">Select Month</option>
                        {MONTHS_LIST.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>

                      {/* Day Dropdown - Accurately sized to the selected month */}
                      <select
                        value={birthdayDay}
                        onChange={(e) => setBirthdayDay(e.target.value)}
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none cursor-pointer"
                      >
                        <option value="">Select Day</option>
                        {getDaysForMonth(birthdayMonth).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Contact Channels, Phone & WhatsApp */}
                  <div className="pt-2 space-y-3">
                    <span className="block text-xs font-bold text-[#F59E0B] uppercase tracking-wider">
                      Phone & Messaging Channels
                    </span>
                    
                    {/* Primary Mobile Carrier Number */}
                    <div>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <label className="text-xs text-slate-300 font-medium flex items-center space-x-1.5 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">Mobile Phone</span>
                        </label>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">e.g. US SIM</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPhone(val);
                          if (whatsappMode === 'same') {
                            setWhatsapp(val);
                          }
                        }}
                        placeholder="+1 617-555-0199"
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                      />
                    </div>

                    {/* WhatsApp Configuration Panel */}
                    <div className="p-3 rounded-2xl bg-[#120B24] border border-[#2E244A] space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-white font-semibold flex items-center space-x-1.5 min-w-0">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">WhatsApp Number</span>
                        </label>
                        <span className="text-[10px] text-emerald-400/90 font-medium shrink-0 whitespace-nowrap">Section & 1:1 chats</span>
                      </div>

                      {/* WhatsApp 3-Option Segmented Selector */}
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#171226] rounded-xl border border-[#2E244A]/80 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappMode('same');
                            setWhatsapp(phone);
                          }}
                          className={`py-2 px-1.5 rounded-lg font-medium text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            whatsappMode === 'same'
                              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-[11px] font-semibold leading-tight">Same as Phone</span>
                          <span className="text-[9px] opacity-70 leading-none">Uses mobile #</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappMode('custom');
                          }}
                          className={`py-2 px-1.5 rounded-lg font-medium text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            whatsappMode === 'custom'
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-[11px] font-semibold leading-tight">Different #</span>
                          <span className="text-[9px] opacity-70 leading-none">International</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappMode('none');
                            setWhatsapp('');
                          }}
                          className={`py-2 px-1.5 rounded-lg font-medium text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            whatsappMode === 'none'
                              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-[11px] font-semibold leading-tight">No WhatsApp</span>
                          <span className="text-[9px] opacity-70 leading-none">SMS / Email</span>
                        </button>
                      </div>

                      {/* Active Status Explanation */}
                      {whatsappMode === 'same' && (
                        <div className="flex items-center justify-between text-[11px] px-1 text-slate-300">
                          <span className="text-slate-400">Connected number:</span>
                          <span className="font-mono text-emerald-400 font-medium">
                            {phone.trim() ? phone : '(matches mobile phone above)'}
                          </span>
                        </div>
                      )}

                      {whatsappMode === 'none' && (
                        <p className="text-[11px] text-amber-300/90 leading-tight px-1">
                          Classmates will reach you via SMS, Email, or In-App Chat.
                        </p>
                      )}

                      {/* Custom International WhatsApp Number Input */}
                      {whatsappMode === 'custom' && (
                        <div className="pt-2 border-t border-[#2E244A]/60 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] text-emerald-300 font-medium truncate">
                              Your WhatsApp Number
                            </label>
                            <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                              include country code
                            </span>
                          </div>
                          <input
                            type="tel"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="+44 7700 900077 or +91 98765 43210"
                            className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-emerald-600/50 focus:border-emerald-400 focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-400 leading-tight">
                            Enter your international WhatsApp number (e.g. UK +44, India +91, Nigeria +234, Brazil +55).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Social Media (Instagram & LinkedIn) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Instagram */}
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1 flex items-center space-x-1.5">
                          <Instagram className="w-3.5 h-3.5 text-pink-400" />
                          <span>Instagram Handle</span>
                        </label>
                        <input
                          type="text"
                          value={instagramHandle}
                          onChange={(e) => setInstagramHandle(e.target.value)}
                          placeholder="@amara_o"
                          className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                        />
                      </div>

                      {/* LinkedIn */}
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1 flex items-center space-x-1.5">
                          <Linkedin className="w-3.5 h-3.5 text-sky-400" />
                          <span>LinkedIn URL (Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/amaraokafor"
                          className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Accordion 2: Geography & Housing */}
            <div className="border border-[#2E244A] rounded-2xl overflow-hidden bg-[#0B0813]/60 shadow-md">
              <button
                type="button"
                onClick={() => toggleSection('housing')}
                className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-slate-200 bg-[#171226]/80 cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <MapPin className="w-4 h-4 text-[#F59E0B]" />
                  <span>2. Geography & Housing</span>
                </div>
                {openSection === 'housing' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {openSection === 'housing' && (
                <div className="p-3.5 sm:p-4 space-y-3.5 border-t border-[#2E244A]">
                  
                  {/* Clean Full-Width Country Dropdown */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Home Country <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={homeCountry}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none cursor-pointer"
                    >
                      {COUNTRIES_LIST.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hometown */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      City / Hometown <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hometown}
                      onChange={(e) => setHometown(e.target.value)}
                      placeholder="e.g. Lagos, Chicago, São Paulo, Seoul, London"
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>

                  {/* Housing Dropdown */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Campus / Off-Campus Housing Location <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value as HousingBuilding)}
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none cursor-pointer"
                    >
                      <optgroup label="HBS Dorms">
                        <option value="Chase Hall">Chase Hall</option>
                        <option value="Gallatin Hall">Gallatin Hall</option>
                        <option value="Hamilton Hall">Hamilton Hall</option>
                        <option value="McCulloch Hall">McCulloch Hall</option>
                        <option value="Mellon Hall">Mellon Hall</option>
                        <option value="Morris Hall">Morris Hall</option>
                      </optgroup>

                      <optgroup label="Harvard University Housing (HUH)">
                        <option value="One Western Avenue">One Western Avenue (OWA)</option>
                        <option value="Peabody Terrace">Peabody Terrace</option>
                        <option value="Soldiers Field Park">Soldiers Field Park (SFP)</option>
                        <option value="100 South Campus Drive">100 South Campus Drive</option>
                      </optgroup>

                      <optgroup label="Off-Campus">
                        <option value="Off-Campus">Off-Campus</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Conditional Unit vs Off-Campus Address */}
                  {selectedBuilding === 'Off-Campus' ? (
                    <div>
                      <label className="block text-xs text-slate-300 font-medium mb-1">
                        Off-Campus Address / Neighborhood <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={offCampusAddress}
                        onChange={(e) => setOffCampusAddress(e.target.value)}
                        placeholder="e.g. 10 Akron St, Cambridge, MA or Back Bay, Boston"
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-slate-300 font-medium mb-1">
                        Room / Unit / Apt # (Optional)
                      </label>
                      <input
                        type="text"
                        value={housingUnit}
                        onChange={(e) => setHousingUnit(e.target.value)}
                        placeholder="e.g. B-32 or Apt 402"
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                      />
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Accordion 3: Background, Education & Post-HBS Goals */}
            <div className="border border-[#2E244A] rounded-2xl overflow-hidden bg-[#0B0813]/60 shadow-md">
              <button
                type="button"
                onClick={() => toggleSection('background')}
                className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-slate-200 bg-[#171226]/80 cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <Briefcase className="w-4 h-4 text-[#F59E0B]" />
                  <span>3. Background, Education & Post-HBS Goals</span>
                </div>
                {openSection === 'background' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {openSection === 'background' && (
                <div className="p-3.5 sm:p-4 space-y-3.5 border-t border-[#2E244A]">
                  
                  {/* Pre-HBS Company & Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs text-slate-300 font-medium mb-1">
                        Pre-HBS Company <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={preHbsCompany}
                        onChange={(e) => setPreHbsCompany(e.target.value)}
                        placeholder="e.g. McKinsey / Stripe / Google"
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-medium mb-1">
                        Pre-HBS Role <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={preHbsRole}
                        onChange={(e) => setPreHbsRole(e.target.value)}
                        placeholder="e.g. Engagement Manager / PM"
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs text-slate-300 font-medium mb-1">
                        Industry Sector
                      </label>
                      <select
                        value={preHbsIndustry}
                        onChange={(e) => setPreHbsIndustry(e.target.value)}
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none cursor-pointer"
                      >
                        <option value="Consulting">Consulting</option>
                        <option value="Finance / PE">Finance / PE</option>
                        <option value="Tech / Product">Tech / Product</option>
                        <option value="Startups / Tech">Startups & Founder</option>
                        <option value="Venture Capital">Venture Capital</option>
                        <option value="Nonprofit & Public Sector">Nonprofit & Public Sector</option>
                        <option value="Healthcare & Biotech">Healthcare & Biotech</option>
                        <option value="Climate & Energy">Climate & Energy</option>
                        <option value="Military / Public Sector">Military / Government</option>
                        <option value="Consumer & Retail">Consumer & Retail</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-medium mb-1">
                        Company URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={companyUrl}
                        onChange={(e) => setCompanyUrl(e.target.value)}
                        placeholder="https://company.com"
                        className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Undergraduate Education - Only Undergraduate University */}
                  <div className="bg-[#171226] p-3.5 rounded-2xl border border-[#2E244A] space-y-2.5">
                    <div className="flex items-center space-x-2 text-[#F59E0B]">
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Undergraduate Education</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">
                          Undergraduate University
                        </label>
                        <input
                          type="text"
                          value={undergradSchool}
                          onChange={(e) => setUndergradSchool(e.target.value)}
                          placeholder="e.g. Stanford University"
                          className="w-full bg-[#0B0813] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">
                          Undergraduate Degree / Major
                        </label>
                        <input
                          type="text"
                          value={undergradDegree}
                          onChange={(e) => setUndergradDegree(e.target.value)}
                          placeholder="e.g. BS in Computer Science"
                          className="w-full bg-[#0B0813] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Prior Graduate Degree Option */}
                  <div className="bg-[#171226] p-3.5 rounded-2xl border border-[#2E244A] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-slate-300 font-medium">Prior Graduate Degree before HBS?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHasGraduateDegree(!hasGraduateDegree)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${hasGraduateDegree ? 'bg-[#F59E0B]' : 'bg-[#2E244A]'}`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            hasGraduateDegree ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {hasGraduateDegree && (
                      <div className="pt-2 border-t border-[#2E244A]/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs text-slate-300 font-medium mb-1">
                            Graduate University
                          </label>
                          <input
                            type="text"
                            value={graduateSchool}
                            onChange={(e) => setGraduateSchool(e.target.value)}
                            placeholder="e.g. Oxford University"
                            className="w-full bg-[#0B0813] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-300 font-medium mb-1">
                            Graduate Degree / Program
                          </label>
                          <input
                            type="text"
                            value={graduateDegree}
                            onChange={(e) => setGraduateDegree(e.target.value)}
                            placeholder="e.g. MSc in Global Finance"
                            className="w-full bg-[#0B0813] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Post-HBS Career Goals & Exploration Options */}
                  <div className="bg-[#171226]/80 p-3.5 rounded-2xl border border-[#2E244A] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs text-slate-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>Post-HBS Career Exploration</span>
                      </label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        postHbsExploration.length >= 8 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                          : 'bg-[#2E244A] text-slate-300'
                      }`}>
                        {postHbsExploration.length}/8 selected
                      </span>
                    </div>

                    {/* Active Selected Explorations Tray */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Your Selected Explorations:</span>
                        {postHbsExploration.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPostHbsExploration([])}
                            className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      {postHbsExploration.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#0B0813] border border-[#2E244A]/80 min-h-[42px]">
                          {postHbsExploration.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center text-xs font-semibold bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-amber-300 pl-2.5 pr-1.5 py-1 rounded-lg border border-[#F59E0B]/50 shadow-sm"
                            >
                              <span className="truncate max-w-[200px]">{tag}</span>
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1.5 p-0.5 rounded-md hover:bg-black/40 text-amber-300/80 hover:text-white cursor-pointer transition-colors"
                                title={`Remove ${tag}`}
                                aria-label={`Remove ${tag}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic p-2 rounded-xl bg-[#0B0813]/60 border border-[#2E244A]/40">
                          No career paths selected yet. Tap popular tags below or type your own.
                        </p>
                      )}
                    </div>

                    {/* Custom Tag input */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Type custom career path (e.g. Sports Management, Defense Tech, EdTech):
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customTagInput}
                          onChange={(e) => setCustomTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomTag();
                            }
                          }}
                          placeholder="Type and press Enter or click Add (supports multiple with commas)..."
                          className="flex-1 bg-[#0B0813] text-white text-xs px-3 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none placeholder-slate-500"
                        />
                        <button
                          type="button"
                          onClick={addCustomTag}
                          disabled={!customTagInput.trim()}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            customTagInput.trim()
                              ? 'bg-[#581C87] hover:bg-[#7E22CE] text-amber-300 border border-[#F59E0B]/40 shadow active:scale-95'
                              : 'bg-[#2E244A]/50 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Available / Popular Tags Pool */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1.5">
                        Tap tags to toggle selection:
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {Array.from(new Set([...POPULAR_CAREER_EXPLORATION_TAGS, ...postHbsExploration])).map((tag) => {
                          const selected = postHbsExploration.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`text-xs px-2.5 py-1.2 rounded-xl transition-all cursor-pointer font-medium ${
                                selected
                                  ? 'bg-[#581C87] text-[#F59E0B] border border-[#F59E0B] shadow-md font-bold'
                                  : 'bg-[#0B0813] text-slate-300 border border-[#2E244A] hover:text-white hover:border-slate-500'
                              }`}
                            >
                              {selected && '✓ '}
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="bg-[#171226]/80 p-3.5 rounded-2xl border border-[#2E244A] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs text-slate-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>Languages Spoken</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2E244A] text-slate-300">
                        {languages.length} {languages.length === 1 ? 'language' : 'languages'}
                      </span>
                    </div>

                    {/* Active Selected Languages Tray */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Your Languages:</span>
                        {languages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setLanguages([])}
                            className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      {languages.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#0B0813] border border-[#2E244A]/80 min-h-[42px]">
                          {languages.map((l) => (
                            <span
                              key={l}
                              className="inline-flex items-center text-xs font-semibold bg-[#581C87]/70 text-purple-200 pl-2.5 pr-1.5 py-1 rounded-lg border border-purple-500/40 shadow-sm"
                            >
                              <span className="truncate max-w-[180px]">{l}</span>
                              <button
                                type="button"
                                onClick={() => removeLanguage(l)}
                                className="ml-1.5 p-0.5 rounded-md hover:bg-black/40 text-purple-300 hover:text-rose-400 cursor-pointer transition-colors"
                                title={`Remove ${l}`}
                                aria-label={`Remove ${l}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic p-2 rounded-xl bg-[#0B0813]/60 border border-[#2E244A]/40">
                          No languages added yet. Tap popular languages below or type any language.
                        </p>
                      )}
                    </div>

                    {/* Custom Language input */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">
                        Type any language (e.g. Yoruba, Swedish, Hebrew, Tagalog):
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={langInput}
                          onChange={(e) => setLangInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addLanguage();
                            }
                          }}
                          placeholder="Type language and press Enter or click Add (supports multiple with commas)..."
                          className="flex-1 bg-[#0B0813] text-white text-xs px-3 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none placeholder-slate-500"
                        />
                        <button
                          type="button"
                          onClick={addLanguage}
                          disabled={!langInput.trim()}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            langInput.trim()
                              ? 'bg-[#581C87] hover:bg-[#7E22CE] text-purple-200 border border-purple-500/40 shadow active:scale-95'
                              : 'bg-[#2E244A]/50 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Popular Languages Quick-Tap Pills */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1.5">
                        Popular Section F languages (Tap to toggle):
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {Array.from(new Set([...POPULAR_LANGUAGES, ...languages])).map((lang) => {
                          const isSelected = languages.some((l) => l.toLowerCase() === lang.toLowerCase());
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => toggleLanguage(lang)}
                              className={`text-xs px-2.5 py-1 rounded-xl transition-all cursor-pointer font-medium ${
                                isSelected
                                  ? 'bg-[#581C87] text-[#F59E0B] border border-[#F59E0B] shadow-md font-bold'
                                  : 'bg-[#0B0813] text-slate-300 border border-[#2E244A] hover:text-white hover:border-slate-500'
                              }`}
                            >
                              {isSelected && '✓ '}
                              {lang}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Countries Lived (Years)
                    </label>
                    <input
                      type="text"
                      value={countriesLived}
                      onChange={(e) => setCountriesLived(e.target.value)}
                      placeholder="e.g. USA (20y), France (2y), Japan (1y)"
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>

                  {/* Section F Fun Fact */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Section F Fun Fact
                    </label>
                    <textarea
                      rows={2}
                      value={funFact}
                      onChange={(e) => setFunFact(e.target.value)}
                      placeholder="Share a fun fact with Section F!"
                      className="w-full bg-[#171226] text-white text-sm p-3 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Hobbies & Weekend Passions
                    </label>
                    <input
                      type="text"
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      placeholder="e.g. Padel, sourdough baking, vinyl collecting, squash"
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 4: Social & Payments */}
            <div className="border border-[#2E244A] rounded-2xl overflow-hidden bg-[#0B0813]/60 shadow-md">
              <button
                type="button"
                onClick={() => toggleSection('social')}
                className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-slate-200 bg-[#171226]/80 cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <DollarSign className="w-4 h-4 text-[#F59E0B]" />
                  <span>4. Payments & Splits (Venmo / Zelle)</span>
                </div>
                {openSection === 'social' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {openSection === 'social' && (
                <div className="p-3.5 sm:p-4 space-y-3.5 border-t border-[#2E244A]">
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Venmo Handle
                    </label>
                    <input
                      type="text"
                      value={venmoHandle}
                      onChange={(e) => setVenmoHandle(e.target.value)}
                      placeholder="@your-venmo"
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Zelle Phone / Email
                    </label>
                    <input
                      type="text"
                      value={zelleInfo}
                      onChange={(e) => setZelleInfo(e.target.value)}
                      placeholder="phone or email for Zelle"
                      className="w-full bg-[#171226] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 5: Partner & Family (Separate Child Name & Years) */}
            <div className="border border-[#2E244A] rounded-2xl overflow-hidden bg-[#0B0813]/60 shadow-md">
              <button
                type="button"
                onClick={() => toggleSection('partner')}
                className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-slate-200 bg-[#171226]/80 cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <Heart className="w-4 h-4 text-[#F59E0B]" />
                  <span>5. Partner & Family (Optional)</span>
                </div>
                {openSection === 'partner' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {openSection === 'partner' && (
                <div className="p-3.5 sm:p-4 space-y-3.5 border-t border-[#2E244A]">
                  
                  {/* Partner Section */}
                  <div className="bg-[#171226] p-3.5 rounded-2xl border border-[#2E244A] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-medium">Do you have a partner / spouse?</span>
                      <button
                        type="button"
                        onClick={() => setHasPartner(!hasPartner)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${hasPartner ? 'bg-[#F59E0B]' : 'bg-[#2E244A]'}`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            hasPartner ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {hasPartner && (
                      <div className="space-y-2.5 pt-2 border-t border-[#2E244A]/60">
                        <div>
                          <label className="block text-xs text-slate-300 font-medium mb-1">
                            Partner / Spouse Name <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required={hasPartner}
                            value={partnerName}
                            onChange={(e) => setPartnerName(e.target.value)}
                            placeholder="e.g. Valentina Rossi"
                            className="w-full bg-[#0B0813] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-300 font-medium mb-1">
                            Partner Affiliation / Profession
                          </label>
                          <input
                            type="text"
                            value={partnerAffiliation}
                            onChange={(e) => setPartnerAffiliation(e.target.value)}
                            placeholder="e.g. Harvard Kennedy School / Architect"
                            className="w-full bg-[#0B0813] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-300 font-medium mb-1">
                            Partner Contact (Instagram, WhatsApp, LinkedIn, or Email)
                          </label>
                          <input
                            type="text"
                            value={partnerContact}
                            onChange={(e) => setPartnerContact(e.target.value)}
                            placeholder="@handle, +1-xxx-xxx, or email"
                            className="w-full bg-[#0B0813] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Children Section - Separate Block for Name and Years */}
                  <div className="bg-[#171226] p-3.5 rounded-2xl border border-[#2E244A] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Baby className="w-4 h-4 text-[#F59E0B]" />
                        <span className="text-xs text-slate-300 font-medium">Do you have children?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHasChildren(!hasChildren)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${hasChildren ? 'bg-[#F59E0B]' : 'bg-[#2E244A]'}`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            hasChildren ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {hasChildren && (
                      <div className="pt-2 border-t border-[#2E244A]/60 space-y-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Children Information
                        </span>

                        {childrenList.map((child, index) => (
                          <div
                            key={index}
                            className="p-3 bg-[#0B0813] rounded-xl border border-[#2E244A] space-y-2 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-[#F59E0B]">
                                Child {index + 1}
                              </span>
                              {childrenList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeChildRow(index)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Separate Name field */}
                              <div>
                                <label className="block text-[11px] text-slate-300 font-medium mb-1">
                                  Child's Name <span className="text-rose-400">*</span>
                                </label>
                                <input
                                  type="text"
                                  required={hasChildren}
                                  value={child.name}
                                  onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                                  placeholder="e.g. Maya"
                                  className="w-full bg-[#171226] text-white text-xs px-3 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                                />
                              </div>

                              {/* Separate Years / Age field */}
                              <div>
                                <label className="block text-[11px] text-slate-300 font-medium mb-1">
                                  Age / Birth Year
                                </label>
                                <input
                                  type="text"
                                  value={child.ageOrYear}
                                  onChange={(e) => handleChildChange(index, 'ageOrYear', e.target.value)}
                                  placeholder="e.g. 3 years old or Born 2023"
                                  className="w-full bg-[#171226] text-white text-xs px-3 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add Another Child Button */}
                        <button
                          type="button"
                          onClick={addChildRow}
                          className="w-full py-2 px-3 rounded-xl border border-dashed border-[#F59E0B]/50 hover:border-[#F59E0B] bg-[#581C87]/20 text-[#F59E0B] hover:text-white text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Another Child</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Accordion 6: Privacy Tier */}
            <div className="border border-[#2E244A] rounded-2xl overflow-hidden bg-[#0B0813]/60 shadow-md">
              <button
                type="button"
                onClick={() => toggleSection('privacy')}
                className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-slate-200 bg-[#171226]/80 cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
                  <span>6. Privacy Controls</span>
                </div>
                {openSection === 'privacy' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {openSection === 'privacy' && (
                <div className="p-3.5 sm:p-4 space-y-2.5 border-t border-[#2E244A]">
                  <div
                    onClick={() => setPrivacyLevel('share_all')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      privacyLevel === 'share_all'
                        ? 'bg-[#581C87]/40 border-[#F59E0B] text-white shadow-md'
                        : 'bg-[#171226] border-[#2E244A] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold">Share Everything with Section F</span>
                      {privacyLevel === 'share_all' && <Check className="w-4 h-4 text-[#F59E0B]" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Classmates can see your full bio, Instagram, WhatsApp, dorm address, and partner details.
                    </p>
                  </div>

                  <div
                    onClick={() => setPrivacyLevel('hide_contact_address')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      privacyLevel === 'hide_contact_address'
                        ? 'bg-[#581C87]/40 border-[#F59E0B] text-white shadow-md'
                        : 'bg-[#171226] border-[#2E244A] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold">Hide Direct Contact & Address</span>
                      {privacyLevel === 'hide_contact_address' && <Check className="w-4 h-4 text-[#F59E0B]" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hides direct WhatsApp phone number and specific dorm room number from deck view.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit CTA */}
            <div className="pt-2 sticky bottom-0 bg-[#171226]/95 backdrop-blur-md pb-1 space-y-2">
              <button
                type="submit"
                disabled={isSaving || isUploadingMain || isUploadingExtra}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#581C87] via-[#7E22CE] to-[#9333EA] hover:from-[#6B21A8] hover:to-[#A855F7] text-white font-bold text-sm shadow-xl flex items-center justify-center space-x-2 border border-[#F59E0B]/50 transition-all cursor-pointer active:scale-95 disabled:opacity-50 min-h-[48px]"
              >
                <CheckCircle className="w-4 h-4 text-[#F59E0B]" />
                <span>{isSaving ? 'Saving to Section F...' : (isEditing ? 'Save Changes' : 'Save & Enter Deck')}</span>
              </button>

              {isEditing && onDeleteProfile && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 px-3 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Profile Card from Directory</span>
                </button>
              )}

              {!isEditing && onSignOut && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline inline-flex items-center space-x-1.5 cursor-pointer py-1"
                  >
                    <LogOut className="w-3 h-3 text-slate-400" />
                    <span>Signed in with wrong account? Sign out & back to Sign In</span>
                  </button>
                </div>
              )}
            </div>

          </form>
        </div>
      )}
      </div>

      {/* Delete Confirmation Modal in Editor */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#171226] border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">Delete Profile from Database?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will permanently delete your Section F card, photos, and information from the database. Other classmates will no longer see your card.
              </p>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B0813] hover:bg-[#201836] text-slate-300 font-semibold text-xs border border-[#2E244A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteProfile) {
                    setIsDeleting(true);
                    try {
                      await onDeleteProfile();
                      setShowDeleteConfirm(false);
                      if (onCloseEdit) onCloseEdit();
                    } catch (e) {
                      console.error('Delete error:', e);
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg border border-rose-400/30 cursor-pointer active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

