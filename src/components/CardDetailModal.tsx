import React, { useState } from 'react';
import { 
  X, 
  Coffee, 
  MessageCircle, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Globe, 
  Heart, 
  DollarSign, 
  Star, 
  ExternalLink,
  Calendar,
  Languages,
  Baby,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Lock,
  Bookmark,
  Image as ImageIcon,
  ShieldAlert,
  User,
  CheckCircle2,
  Clock,
  FileText,
  Edit3,
  Copy,
  Check,
  Share2,
  MessageSquare
} from 'lucide-react';
import { Profile, CoffeeChatRecord } from '../types';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { motion, AnimatePresence } from 'motion/react';
import { playTapSound, playPopSound } from '../utils/soundEffects';

interface CardDetailModalProps {
  profile: Profile | null;
  isGuest?: boolean;
  isSaved?: boolean;
  coffeeChatRecord?: CoffeeChatRecord | null;
  onToggleSave?: (profile: Profile) => void;
  onClose: () => void;
  onCoffeeChat: (profile: Profile) => void;
  onOpenCoffeeChatNote?: (profile: Profile) => void;
  onOpenInAppChat?: (profile: Profile) => void;
  onGuestActionPrompt?: (actionName: string) => void;
  onEditProfile?: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  profile,
  isGuest = false,
  isSaved = false,
  coffeeChatRecord,
  onToggleSave,
  onClose,
  onCoffeeChat,
  onOpenCoffeeChatNote,
  onOpenInAppChat,
  onGuestActionPrompt,
  onEditProfile,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  if (!profile) return null;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapSound();
    const appUrl = 'https://sectionf28.ai.studio';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${profile.fullName} · Section F Community Hub`,
          text: `Check out ${profile.fullName}'s profile on the Section F Class of 2028 Community Hub!`,
          url: appUrl,
        });
        return;
      } catch (err) {}
    }
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    } catch (err) {}
  };

  // Compile all photos
  const allPhotos = [profile.photoUrl, ...(profile.additionalPhotos || [])].filter(
    (url): url is string => Boolean(url && url.trim())
  );

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

  const openLightbox = (e: React.MouseEvent, index?: number) => {
    e.stopPropagation();
    if (allPhotos.length === 0) return;
    if (typeof index === 'number') {
      setActivePhotoIndex(index);
    }
    setIsLightboxOpen(true);
  };

  const getHousingText = () => {
    if (isGuest) {
      if (profile.housingBuilding) {
        return `${profile.housingBuilding} (Room masked for guests)`;
      }
      switch (profile.housingType) {
        case 'dorm':
          return 'HBS Dorm Campus (Masked for guests)';
        case 'sfp':
          return 'Soldiers Field Park (Masked for guests)';
        case 'owa':
          return 'One Western Avenue (Masked for guests)';
        case 'peabody':
          return 'Peabody Terrace (Masked for guests)';
        case 'south_campus':
          return '100 South Campus Drive (Masked for guests)';
        case 'off_campus':
          return 'Off-Campus (Cambridge / Boston)';
        default:
          return 'Cambridge, MA';
      }
    }

    if (profile.housingDetail) {
      return profile.housingDetail;
    }
    if (profile.housingBuilding) {
      return profile.housingBuilding;
    }
    switch (profile.housingType) {
      case 'dorm':
        return 'HBS Dorm Campus';
      case 'sfp':
        return 'Soldiers Field Park (SFP)';
      case 'owa':
        return 'One Western Avenue (OWA)';
      case 'peabody':
        return 'Peabody Terrace';
      case 'south_campus':
        return '100 South Campus Drive';
      case 'off_campus':
        return 'Off-Campus (Cambridge / Boston)';
      default:
        return 'Cambridge, MA';
    }
  };

  const getInstagramUrl = (handle: string) => {
    const clean = handle.replace('@', '').trim();
    return `https://instagram.com/${clean}`;
  };

  const handleAction = (actionName: string, execute: () => void) => {
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt(actionName);
    } else {
      execute();
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xl flex items-center justify-center p-2.5 sm:p-4"
        onClick={() => {
          playTapSound();
          onClose();
        }}
      >
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[#150E26]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[92dvh]"
        >
          
          {/* Top Hero with Photo and Close (Taller viewport & chest-up framing) */}
          <div 
            onClick={allPhotos.length > 0 ? (e) => {
              playTapSound();
              openLightbox(e, activePhotoIndex);
            } : undefined}
            className={`relative h-72 sm:h-80 w-full bg-[#160E26] shrink-0 overflow-hidden isolate group/hero ${
              allPhotos.length > 0 ? 'cursor-zoom-in' : ''
            }`}
            title={allPhotos.length > 0 ? 'Click to view full photo' : undefined}
          >
            {allPhotos.length > 0 && allPhotos[activePhotoIndex] ? (
              <img
                src={allPhotos[activePhotoIndex]}
                alt={`${profile.fullName} - Photo ${activePhotoIndex + 1}`}
                className="w-full h-full object-cover object-[center_15%] transition-transform duration-500 ease-out group-hover/hero:scale-105 will-change-transform"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1530] via-[#140e24] to-[#171226] p-6 select-none relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(126,34,206,0.18),transparent_70%)] pointer-events-none" />
                <div className="w-24 h-24 rounded-full bg-[#2E244A]/50 border-2 border-[#2E244A] flex items-center justify-center shadow-inner mb-2">
                  <User className="w-12 h-12 text-slate-400" />
                </div>
                <span className="text-xs font-semibold text-slate-400 tracking-wide">
                  No photo uploaded
                </span>
              </div>
            )}
            {/* Compact Top & Bottom Gradients - Leaves face, neck, and chest 100% visible */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#150E26] from-15% via-[#150E26]/80 via-45% to-transparent pointer-events-none" />

            {/* Action Buttons: Bookmark, Zoom and Close */}
            <div className="absolute top-3.5 right-3.5 flex items-center space-x-1.5 z-20">
              {onToggleSave && !profile.isCurrentUser && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playPopSound();
                    onToggleSave(profile);
                  }}
                  className={`p-2 rounded-full border shadow-lg transition-all cursor-pointer ${
                    isSaved
                      ? 'bg-amber-400 border-amber-400 text-slate-950 ring-2 ring-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'bg-black/60 text-white hover:text-amber-400 border-white/20'
                  }`}
                  title={isSaved ? 'Remove from Saved' : 'Save to Favorites'}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </motion.button>
              )}
              {allPhotos.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    playTapSound();
                    openLightbox(e, activePhotoIndex);
                  }}
                  className="p-2 rounded-full bg-black/60 text-white hover:text-amber-400 hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg"
                  title="View full-screen photo"
                >
                  <Maximize2 className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="p-2 rounded-full bg-black/60 text-white hover:text-amber-400 hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg"
                title={copiedShare ? 'Link Copied!' : 'Share Profile'}
              >
                {copiedShare ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  playTapSound();
                  onClose();
                }}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg"
                title="Close profile"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Country flag badge */}
            <div className="absolute top-3.5 left-3.5 flex items-center space-x-1.5 z-10">
              <div className="inline-flex items-center space-x-1.5 bg-[#0B0813]/85 backdrop-blur-md px-3 py-1 rounded-full border border-[#2E244A] shadow-lg">
                <span className="text-sm font-emoji">
                  {profile.countryCode ? (
                    String.fromCodePoint(...profile.countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))
                  ) : '🌎'}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {profile.homeCountry}
                </span>
              </div>
            </div>

            {/* Multi-photo previous/next arrows */}
            {allPhotos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg active:scale-95 z-10"
                  title="Previous Photo"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all border border-white/20 cursor-pointer shadow-lg active:scale-95 z-10"
                  title="Next Photo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Hero Name & Nickname - Anchored down to reveal face and chest */}
            <div className="absolute bottom-2 left-4 right-4 text-left">
              <div className="flex items-baseline space-x-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow">
                  {profile.fullName}
                </h2>
                {profile.nickname && (
                  <span className="text-xs font-semibold text-[#F59E0B] bg-[#581C87] px-2 py-0.5 rounded-md border border-[#F59E0B]/30">
                    "{profile.nickname}"
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Multi-Photo Thumbnails Gallery Strip */}
          {allPhotos.length > 1 && (
            <div className="bg-[#171226] px-4 py-2.5 flex items-center space-x-2.5 border-b border-[#2E244A] shrink-0 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
                <ImageIcon className="w-3 h-3 text-[#F59E0B]" />
                <span>{allPhotos.length} Photos:</span>
              </span>
              {allPhotos.map((url, idx) => (
                <button
                  key={idx}
                  onClick={(e) => openLightbox(e, idx)}
                  className={`relative w-11 h-11 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    activePhotoIndex === idx ? 'border-[#F59E0B] scale-105 shadow-md ring-2 ring-[#F59E0B]/30' : 'border-[#2E244A] opacity-60 hover:opacity-100'
                  }`}
                  title={`View photo ${idx + 1}`}
                >
                  <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-left">
            
            {/* Quick Action CTAs */}
            {!profile.isCurrentUser ? (
              isGuest ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAction('Coffee Chats', () => onCoffeeChat(profile))}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white border border-[#F59E0B]/40 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Coffee className="w-4 h-4 text-[#F59E0B]" />
                    <span>Coffee Chat</span>
                  </button>

                  {profile.whatsapp && !profile.notOnWhatsApp ? (
                    <button
                      onClick={() => handleAction('WhatsApp Message', () => {
                        window.open(`https://wa.me/${profile.whatsapp!.replace(/[^0-9]/g, '')}`, '_blank');
                      })}
                      className="py-2.5 px-3 rounded-xl bg-emerald-950/70 border border-emerald-600/40 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>WhatsApp (Sign in)</span>
                    </button>
                  ) : profile.phone ? (
                    <button
                      onClick={() => handleAction('Phone / SMS', () => {
                        window.open(`sms:${profile.phone!.replace(/[^0-9+]/g, '')}`, '_self');
                      })}
                      className="py-2.5 px-3 rounded-xl bg-amber-950/70 border border-amber-600/40 text-amber-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Text / SMS (Sign in)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('Email Classmate', () => {
                        const subject = encodeURIComponent("Connecting via Section F Directory!");
                        const body = encodeURIComponent(
                          `Hey ${profile.nickname || profile.fullName.split(' ')[0]},\r\n\r\nI saw your profile on the Section F app and wanted to say hello!\r\n\r\nBest,`
                        );
                        window.location.href = `mailto:${encodeURIComponent(profile.email)}?subject=${subject}&body=${body}`;
                      })}
                      className="py-2.5 px-3 rounded-xl bg-[#2E244A]/80 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-[#2E244A] cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-[#F59E0B]" />
                      <span>Send Email</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (coffeeChatRecord && coffeeChatRecord.status !== 'none' && onOpenCoffeeChatNote) {
                        onOpenCoffeeChatNote(profile);
                      } else {
                        handleAction('Coffee Chats', () => onCoffeeChat(profile));
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
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md border active:scale-95 transition-all cursor-pointer ${
                      coffeeChatRecord?.status === 'completed'
                        ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-200'
                        : coffeeChatRecord?.status === 'scheduled'
                        ? 'bg-purple-900/80 hover:bg-purple-800 border-purple-400/50 text-purple-200'
                        : coffeeChatRecord?.status === 'request_sent'
                        ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/50 text-amber-200'
                        : 'bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white border-[#F59E0B]/40'
                    }`}
                  >
                    {coffeeChatRecord?.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : coffeeChatRecord?.status === 'scheduled' ? (
                      <Calendar className="w-4 h-4 text-purple-300" />
                    ) : coffeeChatRecord?.status === 'request_sent' ? (
                      <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    ) : (
                      <Coffee className="w-4 h-4 text-[#F59E0B]" />
                    )}
                    <span>
                      {coffeeChatRecord?.status === 'completed'
                        ? 'Completed • Notes'
                        : coffeeChatRecord?.status === 'scheduled'
                        ? 'Scheduled'
                        : coffeeChatRecord?.status === 'request_sent'
                        ? 'Invite Pending'
                        : 'Coffee Chat'}
                    </span>
                  </button>

                  {/* In-App Direct Chat */}
                  <button
                    onClick={() => {
                      if (onOpenInAppChat) {
                        playTapSound();
                        onOpenInAppChat(profile);
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#4C1D95] to-[#581C87] hover:from-[#581C87] hover:to-[#6B21A8] border border-[#A855F7]/40 text-purple-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-[#F59E0B]" />
                    <span>Chat</span>
                  </button>

                  {profile.whatsapp && !profile.notOnWhatsApp ? (
                    <button
                      onClick={() => handleAction('WhatsApp Message', () => {
                        const cleanPhone = profile.whatsapp!.replace(/[^0-9]/g, '');
                        window.location.href = `whatsapp://send?phone=${cleanPhone}`;
                      })}
                      className="py-2.5 px-3 rounded-xl bg-emerald-950/70 border border-emerald-600/40 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>
                  ) : profile.phone ? (
                    <button
                      onClick={() => handleAction('Text / Call', () => {
                        window.open(`sms:${profile.phone!.replace(/[^0-9+]/g, '')}`, '_self');
                      })}
                      className="py-2.5 px-3 rounded-xl bg-amber-950/70 border border-amber-600/40 text-amber-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
                    >
                      <Phone className="w-4 h-4 text-amber-400" />
                      <span>Text / Call</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('Email Classmate', () => {
                        const subject = encodeURIComponent("Connecting via Section F Cards!");
                        const body = encodeURIComponent(
                          `Hey ${profile.nickname || profile.fullName.split(' ')[0]},\r\n\r\nI saw your profile on the Section F app and wanted to say hello!\r\n\r\nBest,`
                        );
                        window.location.href = `mailto:${encodeURIComponent(profile.email)}?subject=${subject}&body=${body}`;
                      })}
                      className="py-2.5 px-3 rounded-xl bg-[#2E244A]/80 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-[#2E244A] cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-amber-400" />
                      <span>Send Email</span>
                    </button>
                  )}

                  {profile.whatsapp && !profile.notOnWhatsApp && (
                    <button
                      onClick={() => handleAction('Email Classmate', () => {
                        const subject = encodeURIComponent("Connecting via Section F Cards!");
                        const body = encodeURIComponent(
                          `Hey ${profile.nickname || profile.fullName.split(' ')[0]},\r\n\r\nI saw your profile on the Section F app and wanted to say hello!\r\n\r\nBest,`
                        );
                        window.location.href = `mailto:${encodeURIComponent(profile.email)}?subject=${subject}&body=${body}`;
                      })}
                      className="py-2.5 px-3 rounded-xl bg-[#2E244A]/80 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-[#2E244A] cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-amber-400" />
                      <span>Send Email</span>
                    </button>
                  )}
                </div>
              )
            ) : (
              <div className="flex items-center space-x-2">
                {onEditProfile ? (
                  <button
                    onClick={() => {
                      playTapSound();
                      onEditProfile();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white hover:text-[#F59E0B] font-bold text-xs flex items-center justify-center space-x-1.5 border border-[#F59E0B]/40 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Edit3 className="w-4 h-4 text-[#F59E0B]" />
                    <span>Edit My Profile Card</span>
                  </button>
                ) : (
                  <div className="flex-1 py-2.5 px-3 rounded-xl bg-[#2E244A]/60 border border-[#2E244A] text-purple-200 text-xs font-semibold flex items-center justify-center space-x-1.5">
                    <User className="w-4 h-4 text-[#F59E0B]" />
                    <span>Your Section F Card</span>
                  </div>
                )}
              </div>
            )}

            {/* Social Profiles Row (Instagram & LinkedIn) - Shown only for classmates */}
            {!profile.isCurrentUser && (profile.instagramHandle || profile.linkedinUrl) && (
              <div className="flex items-center space-x-2 pt-0.5">
                {profile.instagramHandle && (
                  <button
                    onClick={() => handleAction('Instagram Profile', () => {
                      window.open(getInstagramUrl(profile.instagramHandle!), '_blank');
                    })}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-pink-950/60 to-purple-950/60 border border-pink-500/40 hover:border-pink-400 text-pink-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow cursor-pointer"
                  >
                    {isGuest ? <Lock className="w-3.5 h-3.5 text-pink-300" /> : <Instagram className="w-3.5 h-3.5 text-pink-400" />}
                    <span className="truncate">{isGuest ? 'Instagram [Locked]' : profile.instagramHandle}</span>
                  </button>
                )}
                {profile.linkedinUrl && (
                  <button
                    onClick={() => handleAction('LinkedIn Profile', () => {
                      window.open(profile.linkedinUrl!, '_blank');
                    })}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-950/60 to-blue-950/60 border border-sky-500/40 hover:border-sky-400 text-sky-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow cursor-pointer"
                  >
                    {isGuest ? <Lock className="w-3.5 h-3.5 text-sky-300" /> : <Linkedin className="w-3.5 h-3.5 text-sky-400" />}
                    <span className="truncate">{isGuest ? 'LinkedIn [Locked]' : 'LinkedIn Profile'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Direct Mobile Phone */}
            {!profile.isCurrentUser && profile.phone && (
              <div className="bg-[#0B0813] p-3 rounded-2xl border border-[#2E244A] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mobile Phone</span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#171226] border border-[#2E244A]">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-slate-400 block font-medium">Calls & SMS</span>
                    <span className="text-xs font-semibold text-white font-mono">{profile.phone}</span>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleAction('Send SMS', () => {
                        window.open(`sms:${profile.phone!.replace(/[^0-9+]/g, '')}`, '_self');
                      })}
                      className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-600/40 text-amber-300 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Send SMS / iMessage"
                    >
                      <span>SMS</span>
                    </button>
                    <button
                      onClick={() => handleAction('Phone Call', () => {
                        window.open(`tel:${profile.phone!.replace(/[^0-9+]/g, '')}`, '_self');
                      })}
                      className="px-2 py-1 rounded-lg bg-[#2E244A]/80 hover:bg-[#2E244A] text-slate-200 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Call Mobile"
                    >
                      <span>Call</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(profile.phone!);
                        setCopiedPhone(true);
                        setTimeout(() => setCopiedPhone(false), 2000);
                      }}
                      className="p-1 rounded-lg bg-[#2E244A]/60 hover:bg-[#2E244A] text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Pre-HBS & Undergrad Background */}
            <div className="bg-[#0B0813] p-3.5 rounded-2xl border border-[#2E244A] space-y-2 text-xs">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Professional & Education</span>
              </h4>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 shrink-0">Pre-HBS Role:</span>
                <span className="font-semibold text-white text-right truncate max-w-[210px] ml-2">
                  {profile.preHbsRole}
                  <span className="text-slate-400 font-normal"> at </span>
                  {profile.companyUrl ? (
                    <a
                      href={profile.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F59E0B] hover:underline"
                    >
                      {profile.preHbsCompany} <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                  ) : (
                    <span className="text-[#F59E0B]">{profile.preHbsCompany}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 shrink-0">Industry:</span>
                <span className="font-semibold text-purple-300 text-right ml-2">{profile.preHbsIndustry}</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 shrink-0">Undergrad:</span>
                <span className="font-semibold text-slate-200 text-right truncate max-w-[210px] ml-2">
                  {profile.undergradSchool}
                  {profile.undergradDegree && <span className="text-purple-300 font-normal text-[11px]"> ({profile.undergradDegree})</span>}
                </span>
              </div>

              {profile.graduateSchool && (
                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-[#2E244A]/50">
                  <span className="text-slate-400 flex items-center space-x-1 shrink-0">
                    <GraduationCap className="w-3 h-3 text-[#F59E0B]" />
                    <span>Grad School:</span>
                  </span>
                  <span className="font-semibold text-amber-200 text-right truncate max-w-[210px] ml-2">
                    {profile.graduateSchool}
                    {profile.graduateDegree && <span className="text-purple-200 font-normal text-[11px]"> ({profile.graduateDegree})</span>}
                  </span>
                </div>
              )}
            </div>

            {/* Post-HBS Target Tags */}
            <div className="pt-1.5 border-t border-[#2E244A]/60">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Target Post-HBS Exploration:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.postHbsExploration.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-semibold bg-[#581C87]/50 text-amber-300 px-2 py-0.5 rounded-lg border border-[#F59E0B]/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Fun Fact */}
            {profile.funFact && profile.funFact.trim() !== '' && !profile.funFact.toLowerCase().includes('proud member') && (
              <div className="bg-gradient-to-br from-[#581C87]/30 to-[#171226] p-3 rounded-2xl border border-[#F59E0B]/30 space-y-1">
                <div className="flex items-center space-x-1.5 text-[#F59E0B]">
                  <Star className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Section F Fun Fact</span>
                </div>
                <p className="text-slate-200 text-xs italic leading-relaxed">
                  "{profile.funFact}"
                </p>
              </div>
            )}

            {/* Location & Housing */}
            <div className="bg-[#0B0813] p-3.5 rounded-2xl border border-[#2E244A] space-y-1.5 text-xs">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Location & Housing</span>
              </h4>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 shrink-0">Hometown:</span>
                <span className="font-semibold text-white truncate max-w-[210px] text-right ml-2">
                  {profile.hometown}, {profile.homeCountry}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 shrink-0">Campus Living:</span>
                <span className="font-semibold text-purple-300 truncate max-w-[210px] text-right ml-2">
                  {getHousingText()}
                </span>
              </div>

              {profile.birthday && (
                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-[#2E244A]/50">
                  <span className="text-slate-400 flex items-center space-x-1 shrink-0">
                    <Calendar className="w-3 h-3 text-[#F59E0B]" />
                    <span>Birthday:</span>
                  </span>
                  <span className="text-slate-200 font-semibold text-right ml-2">{profile.birthday}</span>
                </div>
              )}

              {profile.countriesLived && (
                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-[#2E244A]/50">
                  <span className="text-slate-400 shrink-0">Countries Lived:</span>
                  <span className="text-slate-300 truncate max-w-[210px] text-right ml-2">{profile.countriesLived}</span>
                </div>
              )}
            </div>

            {/* Languages & Hobbies */}
            <div className="bg-[#0B0813] p-3.5 rounded-2xl border border-[#2E244A] space-y-1.5 text-xs">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Languages className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Languages & Hobbies</span>
              </h4>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 text-slate-300">
                <span className="text-slate-400 shrink-0">Languages:</span>
                {profile.languages && profile.languages.length > 0 ? (
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    {profile.languages.map((l, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-[#581C87]/40 border border-purple-500/30 text-purple-200 text-[11px] font-medium">
                        {l}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">None listed</span>
                )}
              </div>

              {profile.hobbies && (
                <div className="flex justify-between items-start text-slate-300 pt-1 border-t border-[#2E244A]/50">
                  <span className="text-slate-400 shrink-0">Hobbies:</span>
                  <span className="text-slate-200 text-right ml-2 line-clamp-2">{profile.hobbies}</span>
                </div>
              )}
            </div>

            {/* Family & Partner Details (Strictly Locked in Guest Mode) */}
            {(profile.hasPartner || profile.hasChildren) && (
              <div className="bg-[#0B0813] p-3.5 rounded-2xl border border-[#2E244A] space-y-3 text-xs">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Family & Partner</span>
                </h4>

                {isGuest ? (
                  <div className="p-3 rounded-xl bg-[#171226] border border-[#2E244A] flex items-start space-x-3">
                    <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-600/30 text-amber-300 shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="text-left space-y-0.5">
                      <span className="text-xs font-bold text-white block">Family Info Private</span>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Partner and children details are visible exclusively to verified Section F classmates.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {profile.hasPartner && profile.partner && (
                      <div className="p-2.5 rounded-xl bg-[#171226] border border-[#2E244A] space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Partner / Spouse</span>
                        <p className="text-white font-semibold">{profile.partner.name || 'Partner'}</p>
                        {profile.partner.affiliation && (
                          <p className="text-slate-400 text-[11px]">{profile.partner.affiliation}</p>
                        )}
                        {profile.partner.contact && (
                          <p className="text-[#F59E0B] text-[11px] font-mono">
                            Contact: {profile.partner.contact}
                          </p>
                        )}
                      </div>
                    )}

                    {profile.hasChildren && (
                      <div className="p-2.5 rounded-xl bg-[#171226] border border-[#2E244A] space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-[#F59E0B]">
                          <Baby className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Children</span>
                        </div>
                        {profile.children && profile.children.length > 0 ? (
                          <div className="space-y-1 pt-0.5">
                            {profile.children.map((ch, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-white">{ch.name}</span>
                                <span className="text-purple-300 font-mono text-[11px]">{ch.ageOrYear}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-200 text-xs">{profile.childrenDetails || 'Has children in section community'}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Social Payments (Venmo / Zelle) */}
            {(profile.venmoHandle || profile.zelleInfo) && (
              <div className="bg-[#0B0813] p-3.5 rounded-2xl border border-[#2E244A] space-y-1.5 text-xs">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Class Splits & Payments</span>
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {isGuest ? (
                    <div className="flex items-center space-x-1.5 text-slate-400 text-xs py-1">
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                      <span>Venmo / Zelle handles visible to verified Section F members</span>
                    </div>
                  ) : (
                    <>
                      {profile.venmoHandle && (
                        <span className="text-[11px] font-mono bg-[#171226] text-sky-400 px-2.5 py-1 rounded-lg border border-[#2E244A]">
                          Venmo: {profile.venmoHandle}
                        </span>
                      )}
                      {profile.zelleInfo && (
                        <span className="text-[11px] font-mono bg-[#171226] text-purple-300 px-2.5 py-1 rounded-lg border border-[#2E244A]">
                          Zelle: {profile.zelleInfo}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </motion.div>

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

