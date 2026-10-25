import React, { useState } from 'react';
import { 
  Star, 
  MapPin, 
  Briefcase, 
  Instagram, 
  MessageCircle, 
  MessageSquare,
  Info, 
  ExternalLink,
  GraduationCap,
  Baby,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Lock,
  Bookmark,
  User,
  Coffee,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  Sparkles
} from 'lucide-react';
import { Profile, CoffeeChatRecord } from '../types';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { motion } from 'motion/react';
import { playPopSound, playTapSound } from '../utils/soundEffects';

interface ClassmateCardProps {
  profile: Profile;
  isGuest?: boolean;
  isSaved?: boolean;
  coffeeChatRecord?: CoffeeChatRecord | null;
  onToggleSave?: (profile: Profile) => void;
  onCoffeeChat: (profile: Profile) => void;
  onOpenDetails: (profile: Profile) => void;
  onOpenCoffeeChatNote?: (profile: Profile) => void;
  onOpenInAppChat?: (profile: Profile) => void;
  onGuestActionPrompt?: (actionName: string) => void;
  onPreviousClassmate?: () => void;
  onNextClassmate?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

export const ClassmateCard: React.FC<ClassmateCardProps> = ({
  profile,
  isGuest = false,
  isSaved = false,
  coffeeChatRecord,
  onToggleSave,
  onCoffeeChat,
  onOpenDetails,
  onOpenCoffeeChatNote,
  onOpenInAppChat,
  onGuestActionPrompt,
  onPreviousClassmate,
  onNextClassmate,
  canGoPrevious = true,
  canGoNext = true,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Combine main photo with additional photos
  const allPhotos: string[] = [
    profile.photoUrl,
    ...(profile.additionalPhotos || [])
  ].filter((url): url is string => Boolean(url && url.trim()));

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allPhotos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allPhotos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const openLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allPhotos.length > 0) {
      setIsLightboxOpen(true);
    }
  };

  const getInstagramUrl = (handle: string) => {
    const clean = handle.replace('@', '').trim();
    return `https://instagram.com/${clean}`;
  };

  const getEmojiFlag = (code?: string) => {
    if (!code || code.length !== 2) return '🌐';
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
  };

  const handleInstagramClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('Instagram & Social Handles');
    } else if (profile.instagramHandle) {
      window.open(getInstagramUrl(profile.instagramHandle), '_blank');
    }
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('WhatsApp & Direct Contact');
    } else if (profile.whatsapp && !profile.notOnWhatsApp) {
      const cleanPhone = profile.whatsapp.replace(/[^0-9]/g, '');
      window.location.href = `whatsapp://send?phone=${cleanPhone}`;
    }
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('Phone & Direct SMS');
    } else if (profile.phone) {
      window.open(`sms:${profile.phone.replace(/[^0-9+]/g, '')}`, '_self');
    }
  };

  const handlePrimaryChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('Coffee Chats');
    } else {
      onCoffeeChat(profile);
    }
  };

  const hasValidFunFact = Boolean(
    profile.funFact &&
    profile.funFact.trim() !== '' &&
    !profile.funFact.toLowerCase().includes('proud member')
  );

  return (
    <>
      <div 
        onClick={() => {
          playTapSound();
          onOpenDetails(profile);
        }}
        className="w-full h-full rounded-3xl overflow-hidden bg-[#160E26] border border-white/10 hover:border-amber-400/50 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.14)] flex flex-col cursor-pointer relative group select-none"
      >
        {/* Card Top Photo Area (Enlarged 60% hero proportion for commanding portrait presence) */}
        <div 
          onClick={allPhotos.length > 0 ? (e) => {
            playTapSound();
            openLightbox(e);
          } : undefined}
          className={`relative h-[60%] min-h-[275px] max-h-[330px] sm:h-[61%] sm:min-h-[285px] sm:max-h-[340px] w-full bg-[#160E26] overflow-hidden isolate group/photo shrink-0 ${
            allPhotos.length > 0 ? 'cursor-zoom-in' : ''
          }`}
          title={allPhotos.length > 0 ? 'Click to view full photo' : undefined}
        >
          {/* Main Photo Image or Generic Avatar Placeholder */}
          {allPhotos.length > 0 && allPhotos[activePhotoIndex] ? (
            <img
              src={allPhotos[activePhotoIndex]}
              alt={profile.fullName}
              className="w-full h-full object-cover object-[center_15%] transition-transform duration-500 ease-out group-hover/photo:scale-105 will-change-transform"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1530] via-[#140e24] to-[#171226] p-6 select-none relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(126,34,206,0.18),transparent_70%)] pointer-events-none" />
              <div className="w-24 h-24 rounded-full bg-[#2E244A]/50 border-2 border-[#2E244A] flex items-center justify-center shadow-inner group-hover/photo:border-[#F59E0B]/50 transition-colors mb-2">
                <User className="w-12 h-12 text-slate-400 group-hover/photo:text-[#F59E0B] transition-colors" />
              </div>
              <span className="text-[11px] font-medium text-slate-400 tracking-wide">
                No photo uploaded
              </span>
            </div>
          )}

          {/* Photo Count & Zoom Badge & Favorite */}
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5">
            {allPhotos.length > 1 && (
              <div className="bg-[#0B0813]/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-[10px] font-bold text-white shadow-md">
                {activePhotoIndex + 1}/{allPhotos.length}
              </div>
            )}

            {/* Favorite / Bookmark Button */}
            {onToggleSave && !profile.isCurrentUser && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  e.stopPropagation();
                  playPopSound();
                  onToggleSave(profile);
                }}
                className={`p-1.5 rounded-full backdrop-blur-md border shadow-md transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-amber-400 border-amber-400 text-slate-950 ring-2 ring-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'bg-[#0B0813]/85 border-white/20 text-white hover:text-amber-400 hover:border-amber-400/50'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save to Favorites'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              </motion.button>
            )}

            {allPhotos.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  playTapSound();
                  openLightbox(e);
                }}
                className="p-1.5 rounded-full bg-[#0B0813]/85 backdrop-blur-md border border-white/20 text-white hover:text-amber-400 shadow-md transition-all cursor-pointer"
                title="View full screen photos"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>

          {/* Compact Gradients - Subtle top shade & tight bottom vignette leaving chin, neck and chest crystal clear */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#171226] from-15% via-[#171226]/80 via-45% to-transparent pointer-events-none" />

          {/* Top Left Floating Chips */}
          <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5">
            <div className="flex items-center space-x-1.5 bg-[#0B0813]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#2E244A] text-xs font-bold text-amber-300 shadow-md">
              <span className="text-sm font-emoji leading-none">{getEmojiFlag(profile.countryCode)}</span>
              <span className="text-slate-200 truncate max-w-[120px]">{profile.homeCountry}</span>
            </div>

            {/* Coffee Chat Status Indicator (Only for signed-in members) */}
            {!isGuest && coffeeChatRecord && coffeeChatRecord.status !== 'none' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenCoffeeChatNote) onOpenCoffeeChatNote(profile);
                }}
                className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md border cursor-pointer transition-all active:scale-95 ${
                  coffeeChatRecord.status === 'completed'
                    ? 'bg-emerald-500/90 text-white border-emerald-400'
                    : coffeeChatRecord.status === 'scheduled'
                    ? 'bg-purple-600/90 text-white border-purple-400'
                    : 'bg-amber-500/90 text-[#0B0813] border-amber-400'
                }`}
                title={
                  coffeeChatRecord.status === 'completed'
                    ? 'Coffee Chat: Completed (Tap to view or edit notes)'
                    : coffeeChatRecord.status === 'scheduled'
                    ? 'Coffee Chat: Scheduled on Calendar (Tap to view details)'
                    : 'Coffee Chat: Invitation Sent (Awaiting response)'
                }
              >
                {coffeeChatRecord.status === 'completed' ? (
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                ) : coffeeChatRecord.status === 'scheduled' ? (
                  <Calendar className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3 stroke-[2.5] animate-pulse" />
                )}
                <span>
                  {coffeeChatRecord.status === 'completed'
                    ? 'Completed'
                    : coffeeChatRecord.status === 'scheduled'
                    ? 'Scheduled'
                    : 'Invite Pending'}
                </span>
              </button>
            )}

            {/* Family Indicators (Locked for Guests to preserve family privacy) */}
            {!isGuest && profile.hasChildren && (
              <div className="bg-amber-950/80 backdrop-blur-md p-1.5 rounded-full border border-amber-600/40 text-amber-300 shadow-md" title="Has Children">
                <Baby className="w-3 h-3 text-[#F59E0B]" />
              </div>
            )}
          </div>

          {/* Left & Right Card Navigation Arrows on Image */}
          {onPreviousClassmate || onNextClassmate ? (
            <>
              {onPreviousClassmate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canGoPrevious) {
                      playTapSound();
                      onPreviousClassmate();
                    }
                  }}
                  disabled={!canGoPrevious}
                  className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 hover:bg-black/85 text-white border border-white/20 flex items-center justify-center shadow-xl backdrop-blur-md transition-all active:scale-90 z-20 ${
                    canGoPrevious
                      ? 'cursor-pointer hover:border-amber-400/60'
                      : 'opacity-20 cursor-not-allowed pointer-events-none'
                  }`}
                  title="Previous Classmate"
                  aria-label="Previous Classmate"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-100" />
                </button>
              )}

              {onNextClassmate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canGoNext) {
                      playTapSound();
                      onNextClassmate();
                    }
                  }}
                  disabled={!canGoNext}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 hover:bg-black/85 text-white border border-white/20 flex items-center justify-center shadow-xl backdrop-blur-md transition-all active:scale-90 z-20 ${
                    canGoNext
                      ? 'cursor-pointer hover:border-amber-400/60'
                      : 'opacity-20 cursor-not-allowed pointer-events-none'
                  }`}
                  title="Next Classmate"
                  aria-label="Next Classmate"
                >
                  <ChevronRight className="w-4 h-4 text-slate-100" />
                </button>
              )}
            </>
          ) : (
            allPhotos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg active:scale-95 z-10"
                  title="Previous Photo"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg active:scale-95 z-10"
                  title="Next Photo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )
          )}

              {/* Photo Dots Indicator */}
          {allPhotos.length > 1 && (
            <div className="absolute top-11 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 z-10">
              {allPhotos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIndex(idx);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                    activePhotoIndex === idx ? 'bg-[#F59E0B] w-3' : 'bg-white/50 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Name & Nickname Lowered close to the bottom boundary */}
          <div className="absolute bottom-2 left-3.5 right-3.5 text-left">
            <div className="flex items-baseline space-x-1.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
                {profile.fullName}
              </h2>
              {profile.nickname && (
                <span className="text-[11px] font-semibold text-[#F59E0B] bg-[#581C87]/80 px-1.5 py-0.2 rounded border border-[#F59E0B]/30">
                  "{profile.nickname}"
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card Body Information - Snug details without excessive space below name */}
        <div className="flex-1 px-3.5 pt-2 pb-2.5 sm:px-4 sm:pt-2.5 sm:pb-3 flex flex-col justify-start gap-1.5 sm:gap-2 bg-[#171226] min-h-0 overflow-hidden">
          
          <div className="flex flex-col gap-1.5 sm:gap-2 min-h-0">
            {/* Role & Company - Clean typography without container border */}
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-300 min-w-0">
              <Briefcase className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <div className="truncate">
                <span className="text-slate-300">{profile.preHbsRole}</span>
                <span className="text-slate-500 mx-1">at</span>
                {profile.companyUrl ? (
                  <a
                    href={profile.companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-white hover:text-[#F59E0B] inline-flex items-center space-x-0.5 underline decoration-[#581C87] decoration-2 underline-offset-2 truncate"
                  >
                    <span className="truncate">{profile.preHbsCompany}</span>
                    <ExternalLink className="w-2.5 h-2.5 inline shrink-0 ml-0.5 text-slate-400" />
                  </a>
                ) : (
                  <span className="font-bold text-white truncate">{profile.preHbsCompany}</span>
                )}
              </div>
            </div>

            {/* University & Location - Clean 2-column inline layout without bordered boxes */}
            <div className="grid grid-cols-2 gap-2 text-[11.5px] text-slate-300">
              {/* Undergrad Education */}
              <div
                className="flex items-center space-x-1.5 min-w-0"
                title={`${profile.undergradSchool}${profile.undergradDegree ? ` (${profile.undergradDegree})` : ''}`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate font-medium text-slate-200">
                  {profile.undergradSchool}
                  {profile.undergradDegree ? ` (${profile.undergradDegree})` : ''}
                </span>
              </div>

              {/* Hometown & Campus Housing Location */}
              {(profile.hometown || profile.homeCountry || (!isGuest && (profile.housingBuilding || profile.housingDetail))) ? (
                <div
                  className="flex items-center space-x-1.5 min-w-0"
                  title={
                    (profile.hometown || profile.homeCountry || '') +
                    (!isGuest && (profile.housingBuilding || profile.housingDetail)
                      ? ` • ${profile.housingBuilding || profile.housingDetail}`
                      : '')
                  }
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate font-medium text-slate-200">
                    {profile.hometown ? profile.hometown : profile.homeCountry}
                    {!isGuest && (profile.housingBuilding || profile.housingDetail)
                      ? ` • ${profile.housingBuilding || profile.housingDetail}`
                      : ''}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 min-w-0 text-slate-500 italic">
                  <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="truncate">Section F '28</span>
                </div>
              )}
            </div>

            {/* Post-HBS Career Exploration Tags - Horizontally Distributed */}
            {profile.postHbsExploration && profile.postHbsExploration.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-0.5">
                  <span className="flex items-center gap-1 text-slate-300 uppercase tracking-wider text-[9px]">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Exploring
                  </span>
                  {profile.postHbsExploration.length > 3 && (
                    <span className="text-[9.5px] text-slate-400 font-semibold bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/[0.06]">
                      +{profile.postHbsExploration.length - 3} more
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 w-full">
                  {profile.postHbsExploration.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="flex-1 min-w-0 text-center text-[10.5px] font-semibold bg-[#0B0813] text-amber-300 px-2 py-0.5 rounded-lg border border-[#2E244A] truncate hover:border-amber-400/30 transition-colors shadow-xs"
                      title={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fun Fact snippet - strictly real, non-empty, and non-generic */}
            {hasValidFunFact && (
              <div className="flex items-center space-x-1.5 text-slate-400 italic text-[11px] truncate">
                <Star className="w-3 h-3 text-[#F59E0B] shrink-0" />
                <p className="line-clamp-1 italic truncate flex-1 text-slate-300">
                  "{profile.funFact}"
                </p>
              </div>
            )}
          </div>

          {/* Primary Action Row with Snug Top Spacing */}
          <div className="flex items-center space-x-2 pt-2 mt-1 border-t border-[#2E244A]/60 shrink-0">
            {profile.isCurrentUser ? (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={(e) => {
                  e.stopPropagation();
                  playTapSound();
                  onOpenDetails(profile);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#2E244A] to-[#3B2560] hover:from-[#3B2560] hover:to-[#581C87] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md border border-amber-400/40 transition-all cursor-pointer min-h-[40px]"
              >
                <User className="w-4 h-4 text-amber-400" />
                <span>My Profile Card • View Details</span>
              </motion.button>
            ) : (
              <>
                {isGuest ? (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapSound();
                      handlePrimaryChatClick(e);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] hover:from-[#6B21A8] hover:to-[#9333EA] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg border border-amber-400/40 transition-all cursor-pointer min-h-[40px]"
                  >
                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                    <span>Coffee Chat</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapSound();
                      if (coffeeChatRecord && coffeeChatRecord.status !== 'none') {
                        if (onOpenCoffeeChatNote) {
                          onOpenCoffeeChatNote(profile);
                        } else {
                          handlePrimaryChatClick(e);
                        }
                      } else {
                        handlePrimaryChatClick(e);
                      }
                    }}
                    title={
                      coffeeChatRecord?.status === 'completed'
                        ? 'Coffee Chat: Completed (Tap to view or edit notes)'
                        : coffeeChatRecord?.status === 'scheduled'
                        ? 'Coffee Chat: Scheduled on Calendar (Tap to view details)'
                        : coffeeChatRecord?.status === 'request_sent'
                        ? 'Coffee Chat: Invitation Sent (Awaiting response)'
                        : 'Invite to a 1-on-1 Coffee Chat'
                    }
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg border transition-all cursor-pointer min-h-[40px] ${
                      coffeeChatRecord?.status === 'completed'
                        ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-200'
                        : coffeeChatRecord?.status === 'scheduled'
                        ? 'bg-purple-900/80 hover:bg-purple-800 border-purple-400/50 text-purple-200'
                        : coffeeChatRecord?.status === 'request_sent'
                        ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/50 text-amber-200'
                        : 'bg-gradient-to-r from-[#581C87] to-[#7E22CE] hover:from-[#6B21A8] hover:to-[#9333EA] text-white border-amber-400/40'
                    }`}
                  >
                    {coffeeChatRecord?.status === 'completed' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Completed • Notes</span>
                      </>
                    ) : coffeeChatRecord?.status === 'scheduled' ? (
                      <>
                        <Calendar className="w-3.5 h-3.5 text-purple-300" />
                        <span>Scheduled • Details</span>
                      </>
                    ) : coffeeChatRecord?.status === 'request_sent' ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>Invite Pending</span>
                      </>
                    ) : (
                      <>
                        <Coffee className="w-3.5 h-3.5 text-amber-400" />
                        <span>Coffee Chat</span>
                      </>
                    )}
                  </motion.button>
                )}

                {profile.instagramHandle && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      playTapSound();
                      handleInstagramClick(e);
                    }}
                    className="p-2.5 rounded-xl bg-pink-950/50 border border-pink-700/40 text-pink-400 hover:text-white transition-all min-h-[40px] flex items-center justify-center cursor-pointer"
                    title={isGuest ? 'Instagram (Locked in Guest Mode)' : `Instagram: ${profile.instagramHandle}`}
                  >
                    {isGuest ? <Lock className="w-4 h-4 text-pink-300" /> : <Instagram className="w-4 h-4" />}
                  </motion.button>
                )}

                {/* In-App Direct Chat Button (Green Message Icon) */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playTapSound();
                    if (isGuest) {
                      if (onGuestActionPrompt) onGuestActionPrompt('In-App Direct Chat');
                      return;
                    }
                    if (onOpenInAppChat) {
                      onOpenInAppChat(profile);
                    }
                  }}
                  className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 hover:text-white transition-all min-h-[40px] flex items-center justify-center cursor-pointer"
                  title={isGuest ? 'In-App Direct Chat (Sign in to message)' : `Message ${profile.nickname || profile.fullName.split(' ')[0]}`}
                  aria-label={`Message ${profile.nickname || profile.fullName.split(' ')[0]}`}
                >
                  {isGuest ? <Lock className="w-4 h-4 text-amber-300" /> : <MessageSquare className="w-4 h-4 text-emerald-400" />}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playTapSound();
                    onOpenDetails(profile);
                  }}
                  className="p-2.5 rounded-xl bg-[#140E26] border border-white/10 text-slate-300 hover:text-white hover:border-amber-400/50 transition-all cursor-pointer min-h-[40px] flex items-center justify-center"
                  title="View Full Profile Details"
                >
                  <Info className="w-4 h-4" />
                </motion.button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Full Photo Lightbox Modal */}
      {isLightboxOpen && (
        <PhotoLightboxModal
          photos={allPhotos}
          initialIndex={activePhotoIndex}
          userName={profile.fullName}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
};

