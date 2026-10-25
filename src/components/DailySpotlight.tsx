import React, { useState } from 'react';
import { 
  SunMedium, 
  Coffee, 
  MessageCircle, 
  Calendar, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Globe, 
  Heart, 
  ExternalLink, 
  Award, 
  Maximize2, 
  Lock, 
  User, 
  CheckCircle2, 
  Clock,
  Phone,
  Sparkles
} from 'lucide-react';
import { Profile, CoffeeChatRecord } from '../types';
import { getDailySpotlightProfile } from '../data/mockProfiles';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { motion, AnimatePresence } from 'motion/react';
import { playTapSound } from '../utils/soundEffects';

interface DailySpotlightProps {
  profiles: Profile[];
  currentUserName?: string;
  isGuest?: boolean;
  coffeeChatRecords?: Record<string, CoffeeChatRecord>;
  onOpenDetails: (profile: Profile) => void;
  onCoffeeChat?: (profile: Profile) => void;
  onOpenCoffeeChatNote?: (profile: Profile) => void;
  onGuestActionPrompt?: (actionName: string) => void;
}

export const DailySpotlight: React.FC<DailySpotlightProps> = ({
  profiles,
  currentUserName = '',
  isGuest = false,
  coffeeChatRecords = {},
  onOpenDetails,
  onCoffeeChat,
  onOpenCoffeeChatNote,
  onGuestActionPrompt,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Exclusively lock to Today
  const targetDate = new Date();
  const spotlightProfile = getDailySpotlightProfile(profiles, targetDate);

  // Compile photos
  const allPhotos = [
    spotlightProfile.photoUrl,
    ...(spotlightProfile.additionalPhotos || [])
  ].filter(Boolean);

  const record = coffeeChatRecords[spotlightProfile.uid];

  const handleCoffeeChat = () => {
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('Daily Spotlight Coffee Chat');
      return;
    }

    if (record && record.status !== 'none' && onOpenCoffeeChatNote) {
      onOpenCoffeeChatNote(spotlightProfile);
      return;
    }

    if (onCoffeeChat) {
      onCoffeeChat(spotlightProfile);
      return;
    }

    const nickname = spotlightProfile.nickname || spotlightProfile.fullName.split(' ')[0];
    const subject = encodeURIComponent("Section F Daily Spotlight Coffee Chat!");
    const body = encodeURIComponent(
      `Hey ${nickname},\r\n\r\nSaw you featured on today's Section F Daily Spotlight! Would love to grab coffee at Spangler / Chao and catch up!\r\n\r\nBest,\r\n${currentUserName || 'A Section F Classmate'}`
    );
    window.location.href = `mailto:${encodeURIComponent(spotlightProfile.email)}?subject=${subject}&body=${body}`;
  };

  const handleWhatsApp = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('WhatsApp & Direct Contact');
    } else if (spotlightProfile.whatsapp && !spotlightProfile.notOnWhatsApp) {
      window.open(`https://wa.me/${spotlightProfile.whatsapp.replace(/[^0-9]/g, '')}`, '_blank');
    }
  };

  const handlePhone = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('Phone & Direct SMS');
    } else if (spotlightProfile.phone) {
      window.open(`sms:${spotlightProfile.phone.replace(/[^0-9+]/g, '')}`, '_self');
    }
  };

  const getEmojiFlag = (code?: string) => {
    if (!code || code.length !== 2) return '🌐';
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
  };

  const formattedDate = targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const getConversationStarter = (p: Profile): string => {
    const firstName = p.nickname || p.fullName.split(' ')[0];
    if (p.funFact && p.funFact.trim() && !p.funFact.toLowerCase().includes('proud member')) {
      return `Ask ${firstName} about: "${p.funFact.trim()}"`;
    }
    if (p.preHbsCompany && p.preHbsRole) {
      return `Ask about their journey as ${p.preHbsRole} at ${p.preHbsCompany}.`;
    }
    if (p.hobbies && p.hobbies.trim()) {
      return `Connect over shared interests: ${p.hobbies.split(',').slice(0, 3).join(', ')}.`;
    }
    if (p.postHbsExploration && p.postHbsExploration.length > 0) {
      return `Discuss mutual exploration in ${p.postHbsExploration.slice(0, 2).join(' & ')}.`;
    }
    return `Reach out to welcome ${firstName} and grab coffee at Spangler or Chao!`;
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto space-y-4 pb-20 pt-1 text-slate-100">
        
        {/* Editorial Header Ribbon */}
        <div className="bg-gradient-to-r from-[#581C87] via-[#7E22CE] to-[#F59E0B] p-0.5 rounded-3xl shadow-2xl">
          <div className="bg-[#171226] p-3 sm:p-4 rounded-[23px] flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#581C87] border border-[#F59E0B] flex items-center justify-center shadow-lg shrink-0">
                <SunMedium className="w-4 h-4 sm:w-5 sm:h-5 text-[#F59E0B] animate-pulse" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <span className="text-[11px] sm:text-xs font-black text-[#F59E0B] uppercase tracking-wider whitespace-nowrap block">
                  Daily Section Spotlight
                </span>
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">{formattedDate}</h2>
              </div>
            </div>

            {/* Live Today Badge */}
            <div className="flex items-center space-x-1.5 bg-[#581C87]/70 border border-[#F59E0B]/40 px-3 py-1.5 rounded-2xl shrink-0 shadow-md">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-black text-[#F59E0B] uppercase tracking-wider">
                TODAY
              </span>
            </div>
          </div>
        </div>

        {/* Main Feature Editorial Card */}
        <motion.div
          key={spotlightProfile.uid}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-[#171226] border-2 border-[#F59E0B]/40 rounded-3xl overflow-hidden shadow-2xl relative select-none"
        >
          
          {/* Championship Gold Ribbon Badge */}
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-1.5">
            <div className="flex items-center space-x-1.5 bg-[#F59E0B] text-[#0B0813] font-extrabold text-xs px-3 py-1 rounded-full shadow-xl">
              <Award className="w-3.5 h-3.5" />
              <span>SECTION F VIP</span>
            </div>
          </div>

          {/* Zoom Photo Button */}
          {Boolean(spotlightProfile.photoUrl) && (
            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white hover:text-[#F59E0B] border border-white/20 transition-all shadow-xl cursor-pointer"
              title="View full-screen photos"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {/* Hero Photo with overlay - Calibrated chest-up framing */}
          <div 
            onClick={spotlightProfile.photoUrl ? () => setIsLightboxOpen(true) : undefined}
            className={`relative h-80 w-full bg-[#0B0813] group/hero overflow-hidden isolate ${
              spotlightProfile.photoUrl ? 'cursor-zoom-in' : ''
            }`}
            title={spotlightProfile.photoUrl ? 'Click to view full photo' : undefined}
          >
            {spotlightProfile.photoUrl && spotlightProfile.photoUrl.trim() !== '' ? (
              <img
                src={spotlightProfile.photoUrl}
                alt={spotlightProfile.fullName}
                className="w-full h-full object-cover object-[center_15%] transition-transform duration-500 ease-out group-hover/hero:scale-105 will-change-transform"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1530] via-[#140e24] to-[#171226] p-6 select-none relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(126,34,206,0.18),transparent_70%)] pointer-events-none" />
                <div className="w-24 h-24 rounded-full bg-[#2E244A]/50 border-2 border-[#2E244A] flex items-center justify-center shadow-inner mb-3">
                  <User className="w-12 h-12 text-slate-400" />
                </div>
                <span className="text-xs font-semibold text-slate-400 tracking-wide">
                  No photo uploaded
                </span>
              </div>
            )}
            {/* Compact bottom vignette leaving chin, neck, and chest clear */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#171226] from-15% via-[#171226]/80 via-45% to-transparent pointer-events-none" />

            {/* Flag & Name floating bottom */}
            <div className="absolute bottom-2 left-4 right-4 flex items-end justify-between">
              <div>
                <div className="inline-flex items-center space-x-1.5 bg-[#0B0813]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#2E244A] text-xs font-bold text-amber-300 mb-1">
                  <span className="text-sm font-emoji leading-none">{getEmojiFlag(spotlightProfile.countryCode)}</span>
                  <span>{spotlightProfile.homeCountry}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
                  {spotlightProfile.fullName}
                </h1>
                {spotlightProfile.nickname && (
                  <p className="text-xs text-[#F59E0B] font-semibold mt-0.5">
                    Known as "{spotlightProfile.nickname}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Editorial Body Content */}
          <div className="p-5 space-y-4">
            
            {/* Quick CTA row */}
            {isGuest ? (
              <div className={spotlightProfile.whatsapp ? "grid grid-cols-2 gap-2" : "w-full"}>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    playTapSound();
                    onOpenDetails(spotlightProfile);
                  }}
                  className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] hover:from-[#6B21A8] hover:to-[#9333EA] text-white border border-amber-400/50 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xl transition-all cursor-pointer"
                >
                  <SunMedium className="w-4 h-4 text-amber-400" />
                  <span>View Full Profile</span>
                </motion.button>

                {spotlightProfile.whatsapp && !spotlightProfile.notOnWhatsApp ? (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      playTapSound();
                      handleWhatsApp();
                    }}
                    className="py-3 px-3 rounded-2xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xl transition-transform cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp (Lock)</span>
                  </motion.button>
                ) : spotlightProfile.phone ? (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      playTapSound();
                      handlePhone();
                    }}
                    className="py-3 px-3 rounded-2xl bg-amber-950/80 border border-amber-600/50 text-amber-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xl transition-transform cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Text / Call (Lock)</span>
                  </motion.button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    playTapSound();
                    handleCoffeeChat();
                  }}
                  title={
                    record?.status === 'completed'
                      ? 'Coffee Chat: Completed (Tap to view or edit notes)'
                      : record?.status === 'scheduled'
                      ? 'Coffee Chat: Scheduled on Calendar (Tap to view details)'
                      : record?.status === 'request_sent'
                      ? 'Coffee Chat: Invitation Sent (Awaiting response)'
                      : 'Invite to a 1-on-1 Coffee Chat'
                  }
                  className={`py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xl border transition-all cursor-pointer ${
                    record?.status === 'completed'
                      ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-200'
                      : record?.status === 'scheduled'
                      ? 'bg-purple-900/80 hover:bg-purple-800 border-purple-400/50 text-purple-200'
                      : record?.status === 'request_sent'
                      ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/50 text-amber-200'
                      : 'bg-gradient-to-r from-[#581C87] to-[#7E22CE] hover:from-[#6B21A8] hover:to-[#9333EA] text-white border-amber-400/50'
                  }`}
                >
                  {record?.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Completed • Notes</span>
                    </>
                  ) : record?.status === 'scheduled' ? (
                    <>
                      <Calendar className="w-4 h-4 text-purple-300" />
                      <span>Scheduled • Notes</span>
                    </>
                  ) : record?.status === 'request_sent' ? (
                    <>
                      <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Invite Pending</span>
                    </>
                  ) : (
                    <>
                      <Coffee className="w-4 h-4 text-amber-400" />
                      <span>Coffee Chat</span>
                    </>
                  )}
                </motion.button>

                {spotlightProfile.whatsapp && !spotlightProfile.notOnWhatsApp ? (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      playTapSound();
                      handleWhatsApp();
                    }}
                    className="py-3 px-3 rounded-2xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xl transition-transform cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp</span>
                  </motion.button>
                ) : spotlightProfile.phone ? (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      playTapSound();
                      handlePhone();
                    }}
                    className="py-3 px-3 rounded-2xl bg-amber-950/80 border border-amber-600/50 text-amber-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xl transition-transform cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-amber-400" />
                    <span>Text / Call</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      playTapSound();
                      onOpenDetails(spotlightProfile);
                    }}
                    className="py-3 px-3 rounded-2xl bg-[#140E26] text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-white/10 cursor-pointer"
                  >
                    <SunMedium className="w-4 h-4 text-amber-400" />
                    <span>View Details</span>
                  </motion.button>
                )}
              </div>
            )}

            {/* Warm Icebreaker Conversation Starter */}
            <div className="bg-gradient-to-r from-[#2A174E] via-[#1D1238] to-[#171226] p-3.5 rounded-2xl border border-amber-400/30 text-left shadow-lg space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Conversation Starter</span>
              </div>
              <p className="text-xs text-amber-100 font-medium leading-relaxed">
                {getConversationStarter(spotlightProfile)}
              </p>
            </div>

            {/* Editorial Highlight Quote */}
            {spotlightProfile.funFact && (
              <div className="bg-[#0B0813] p-4 rounded-2xl border border-[#2E244A] space-y-2 text-left">
                <div className="flex items-center space-x-2 text-[#F59E0B]">
                  <SunMedium className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Spotlight Fun Fact</span>
                </div>
                <p className="text-xs text-slate-200 italic leading-relaxed">
                  "{spotlightProfile.funFact}"
                </p>
              </div>
            )}

            {/* Quick Dossier Grid - Compact Rows */}
            <div className="grid grid-cols-2 gap-2 text-left text-xs">
              <div className="bg-[#0B0813] p-2.5 rounded-xl border border-[#2E244A]">
                <span className="text-[10px] text-slate-500 block mb-0.5">Pre-HBS Background</span>
                <span className="font-semibold text-white truncate block">
                  {spotlightProfile.preHbsRole}
                </span>
                <span className="text-[#F59E0B] text-[11px] truncate block">
                  {spotlightProfile.preHbsCompany}
                </span>
              </div>

              <div className="bg-[#0B0813] p-2.5 rounded-xl border border-[#2E244A]">
                <span className="text-[10px] text-slate-500 block mb-0.5">Campus & Town</span>
                <span className="font-semibold text-purple-300 truncate block">
                  {isGuest 
                    ? (spotlightProfile.housingBuilding ? `${spotlightProfile.housingBuilding}` : 'HBS Campus')
                    : (spotlightProfile.housingBuilding || spotlightProfile.housingDetail || 'HBS Campus')}
                </span>
                <span className="text-slate-400 text-[11px] truncate block">
                  {spotlightProfile.hometown}
                </span>
              </div>
            </div>

            {/* Education & Passions - Clean 1-Row Items */}
            <div className="bg-[#0B0813] p-2.5 rounded-xl border border-[#2E244A] text-left text-xs space-y-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 shrink-0">Undergrad:</span>
                <span className="text-slate-200 font-semibold truncate max-w-[220px] text-right ml-2">
                  {spotlightProfile.undergradSchool}
                </span>
              </div>
              {spotlightProfile.hobbies && (
                <div className="flex justify-between items-center pt-1 border-t border-[#2E244A]/50 text-slate-300">
                  <span className="text-slate-400 shrink-0">Hobbies:</span>
                  <span className="text-slate-300 text-[11px] truncate max-w-[220px] text-right ml-2">
                    {spotlightProfile.hobbies}
                  </span>
                </div>
              )}
            </div>

            {/* Full Card CTA button */}
            <button
              onClick={() => onOpenDetails(spotlightProfile)}
              className="w-full py-3 rounded-2xl bg-[#0B0813] hover:bg-[#171226] border border-[#F59E0B]/40 hover:border-[#F59E0B] text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <span>Explore {spotlightProfile.fullName.split(' ')[0]}'s Full Section F Card</span>
            </button>

          </div>
        </motion.div>

      </div>

      {/* Photo Lightbox */}
      {isLightboxOpen && (
        <PhotoLightboxModal
          photos={allPhotos}
          userName={spotlightProfile.fullName}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
};

