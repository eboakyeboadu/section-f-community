import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  ChevronLeft,
  ChevronRight,
  CheckCircle2, 
  SlidersHorizontal,
  Dices,
  Bookmark,
  Search,
  Smartphone,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Profile, CoffeeChatRecord } from '../types';
import { ClassmateCard } from './ClassmateCard';
import { playTapSound, playSwooshSound, playPopSound } from '../utils/soundEffects';

interface CardDeckProps {
  profiles: Profile[];
  savedUids?: string[];
  coffeeChatRecords?: Record<string, CoffeeChatRecord>;
  onToggleSave?: (profile: Profile) => void;
  showSavedOnly?: boolean;
  onToggleSavedOnly?: () => void;
  currentUserName?: string;
  isGuest?: boolean;
  onOpenDetails: (profile: Profile) => void;
  onOpenCoffeeChatNote?: (profile: Profile) => void;
  onOpenInAppChat?: (profile: Profile) => void;
  onCoffeeChatAction?: (profile: Profile) => void;
  onResetFilters?: () => void;
  onGuestActionPrompt?: (actionName: string) => void;
}

// Fisher-Yates array shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const CardDeck: React.FC<CardDeckProps> = ({
  profiles,
  savedUids = [],
  coffeeChatRecords = {},
  onToggleSave,
  showSavedOnly = false,
  onToggleSavedOnly,
  currentUserName = '',
  isGuest = false,
  onOpenDetails,
  onOpenCoffeeChatNote,
  onOpenInAppChat,
  onCoffeeChatAction,
  onResetFilters,
  onGuestActionPrompt,
}) => {
  const [deckProfiles, setDeckProfiles] = useState<Profile[]>(profiles);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);
  const [isShakingAnimation, setIsShakingAnimation] = useState<boolean>(false);
  const [motionPermissionGranted, setMotionPermissionGranted] = useState<boolean>(false);
  const [isIOSWithMotionPermission, setIsIOSWithMotionPermission] = useState<boolean>(false);
  const [hasPromptedMotion, setHasPromptedMotion] = useState<boolean>(false);

  const isAnimatingRef = useRef<boolean>(false);
  const lastShakeTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  // Lightweight debounced background pre-fetch for next card only (never blocks the main thread)
  useEffect(() => {
    if (!deckProfiles || deckProfiles.length === 0) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx < deckProfiles.length) {
      const p = deckProfiles[nextIdx];
      if (p?.photoUrl) {
        const timer = setTimeout(() => {
          const img = new Image();
          img.src = p.photoUrl;
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, deckProfiles]);

  // Keyboard arrow navigation for laptop / desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
         document.activeElement.tagName === 'TEXTAREA' ||
         (document.activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, deckProfiles.length]);

  // Detect iOS 13+ DeviceMotionEvent.requestPermission support
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      setIsIOSWithMotionPermission(true);
      // Check if previously granted in this session
      const savedPref = sessionStorage.getItem('hsb_shake_permission');
      if (savedPref === 'granted') {
        setMotionPermissionGranted(true);
      }
    } else {
      // Non-iOS or older devices have motion enabled by default
      setMotionPermissionGranted(true);
    }
  }, []);

  const currentIndexRef = useRef<number>(currentIndex);
  currentIndexRef.current = currentIndex;

  // Sync internal deck when profiles list changes while preserving active card & shuffle order
  useEffect(() => {
    setDeckProfiles((prevDeck) => {
      // If incoming profiles list is empty
      if (!profiles || profiles.length === 0) {
        setCurrentIndex(0);
        return [];
      }

      const activeIdx = currentIndexRef.current;
      const activeUid = prevDeck[activeIdx]?.uid;

      // Quick lookup map of incoming profiles by UID
      const incomingMap = new Map<string, Profile>(profiles.map((p) => [p.uid, p]));

      // Determine if current deck was shuffled (same cohort members, different order)
      const isSameCohort =
        prevDeck.length === profiles.length &&
        prevDeck.length > 0 &&
        prevDeck.every((p) => incomingMap.has(p.uid));

      let nextDeck: Profile[];
      if (isSameCohort) {
        // Keep user's custom/shuffled order and update profile fields in-place
        nextDeck = prevDeck.map((p) => incomingMap.get(p.uid) || p);
      } else {
        // Filter or roster changed: use the new incoming profiles order
        nextDeck = profiles;
      }

      // Preserve active card position by UID if present in next deck
      if (activeUid && incomingMap.has(activeUid)) {
        const nextIndex = nextDeck.findIndex((p) => p.uid === activeUid);
        if (nextIndex !== -1) {
          if (nextIndex !== activeIdx) {
            setCurrentIndex(nextIndex);
          }
          return nextDeck;
        }
      }

      // If active card was removed (e.g. un-bookmarked while in "Saved Only" mode),
      // clamp smoothly to the next valid adjacent card instead of snapping to 0
      const safeIndex = Math.min(activeIdx, Math.max(0, nextDeck.length - 1));
      if (safeIndex !== activeIdx) {
        setCurrentIndex(safeIndex);
      }
      return nextDeck;
    });
  }, [profiles]);

  // Tactile Haptic Vibration Pattern via navigator.vibrate API
  const triggerShakeHaptic = (isPhysicalShake = false) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (isPhysicalShake) {
          navigator.vibrate([40, 40, 60, 40, 80]);
        } else {
          navigator.vibrate([30, 40, 40]);
        }
      } catch (e) {}
    }
  };

  // iOS Safari 13+ Accelerometer Permission Request triggered by direct user gesture
  const requestMotionPermission = async () => {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setMotionPermissionGranted(true);
          sessionStorage.setItem('hsb_shake_permission', 'granted');
        }
      } catch (e) {
        console.warn('Motion permission request error:', e);
      }
    }
  };

  // Trigger permission prompt on first user card interaction (tap/drag)
  const handleUserCardInteraction = () => {
    if (isIOSWithMotionPermission && !motionPermissionGranted && !hasPromptedMotion) {
      setHasPromptedMotion(true);
      requestMotionPermission();
    }
  };

  // Execute Shuffle with Tactile & Visual Feedback
  const handleShuffle = (isPhysicalShake = false) => {
    if (deckProfiles.length <= 1) return;

    playSwooshSound();
    triggerShakeHaptic(isPhysicalShake);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#F59E0B', '#A855F7', '#EC4899', '#FFFFFF']
    });

    setIsShakingAnimation(true);
    setTimeout(() => setIsShakingAnimation(false), 500);

    setDirection(1);
    setDeckProfiles((prev) => shuffleArray(prev));
    setCurrentIndex(0);
  };

  // Listen to physical device shake gesture
  useEffect(() => {
    const SHAKE_THRESHOLD = 22;
    const SHAKE_COOLDOWN_MS = 2000; // 2s cooldown ensures a natural shake motion fires exactly once

    const handleMotion = (event: DeviceMotionEvent) => {
      const current = event.acceleration || event.accelerationIncludingGravity;
      if (!current || current.x === null || current.y === null || current.z === null) return;

      const deltaX = Math.abs(current.x - lastCoordsRef.current.x);
      const deltaY = Math.abs(current.y - lastCoordsRef.current.y);
      const deltaZ = Math.abs(current.z - lastCoordsRef.current.z);

      // Continuously update coordinates so stale deltas never fire a phantom second shuffle!
      lastCoordsRef.current = { x: current.x, y: current.y, z: current.z };

      const now = Date.now();
      if (now - lastShakeTimeRef.current < SHAKE_COOLDOWN_MS) return;

      if (deltaX + deltaY + deltaZ > SHAKE_THRESHOLD) {
        lastShakeTimeRef.current = now;
        handleShuffle(true);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, []);

  const currentProfile = deckProfiles[currentIndex];

  const handleCoffeeChat = (target: Profile) => {
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('Coffee Chats');
      return;
    }

    if (onCoffeeChatAction) {
      onCoffeeChatAction(target);
      return;
    }

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });

    const nickname = target.nickname || target.fullName.split(' ')[0];
    const subject = encodeURIComponent("Section F Coffee Chat!");
    const body = encodeURIComponent(
      `Hey ${nickname},\r\n\r\nI saw your Section F card and would love to grab a coffee chat at Spangler / Chao / Esteves when you're free!\r\n\r\nBest,\r\n${currentUserName || 'Your Section F Classmate'}`
    );
    window.location.href = `mailto:${encodeURIComponent(target.email)}?subject=${subject}&body=${body}`;
  };

  const handleNext = () => {
    if (currentIndex < deckProfiles.length - 1) {
      playSwooshSound();
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      playSwooshSound();
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : dir < 0 ? '-100%' : 0,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 480, damping: 38, mass: 0.6 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring' as const, stiffness: 480, damping: 38, mass: 0.6 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      }
    })
  };

  const renderCardContent = () => {
    // Empty State: No profiles matching
    if (!deckProfiles || deckProfiles.length === 0) {
      if (showSavedOnly) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[440px] bg-[#171226]/80 rounded-3xl border border-[#2E244A] shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#581C87]/40 border border-[#F59E0B]/30 flex items-center justify-center mb-3">
              <Bookmark className="w-8 h-8 text-[#F59E0B]" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Bookmarked Classmates</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
              Tap the bookmark icon on any classmate's profile to save profiles you want to revisit later.
            </p>
            {onToggleSavedOnly && (
              <button
                onClick={onToggleSavedOnly}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white font-semibold text-xs border border-[#F59E0B]/40 shadow-lg cursor-pointer hover:border-[#F59E0B] transition-all"
              >
                Browse All Classmates
              </button>
            )}
          </div>
        );
      }

      if (onResetFilters) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[440px] bg-[#171226]/80 rounded-3xl border border-[#2E244A] shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#581C87]/40 border border-[#F59E0B]/30 flex items-center justify-center mb-3">
              <Search className="w-8 h-8 text-[#F59E0B]" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Classmates Match Filter</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
              No classmate in Section F matches your current search or filters.
            </p>
            <button
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white font-semibold text-xs border border-[#F59E0B]/40 shadow-lg cursor-pointer hover:border-[#F59E0B] transition-all"
            >
              Reset Filters
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[440px] bg-[#171226]/80 rounded-3xl border border-[#2E244A] shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#581C87]/40 border border-[#F59E0B]/30 flex items-center justify-center mb-3">
            <SlidersHorizontal className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Classmates Match Filters</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-xs">
            Try loosening your country, housing, or career exploration filters to discover more of Section F.
          </p>
        </div>
      );
    }

    // End of Deck
    if (currentIndex >= deckProfiles.length) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[440px] bg-[#171226] rounded-3xl border border-[#2E244A] shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#581C87] to-[#F59E0B] p-0.5 mb-4 shadow-xl">
            <div className="w-full h-full bg-[#171226] rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-[#F59E0B]" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {showSavedOnly ? `Browsed All ${deckProfiles.length} Saved Profiles!` : `You've Browsed All ${deckProfiles.length} Classmates!`}
          </h3>
          <p className="text-xs text-slate-400 mb-5 max-w-xs leading-relaxed">
            Great job connecting with Section F. You can shuffle the deck, explore Section Infographics, or start over.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => handleShuffle(false)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white font-bold text-xs shadow-lg border border-[#F59E0B]/30 cursor-pointer active:scale-95 transition-all"
            >
              <Dices className="w-4 h-4 text-[#F59E0B]" />
              <span>Shuffle & Reshuffle</span>
            </button>
            <button
              onClick={() => {
                setDirection(-1);
                setCurrentIndex(0);
              }}
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-[#0B0813] text-slate-300 hover:text-white font-bold text-xs border border-[#2E244A] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Over</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full select-none">
        {/* Strictly single active card - clean directional slide transitions with instant button/arrow response */}
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentProfile.uid}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full h-full will-change-transform transform-gpu select-none relative"
          >
            <ClassmateCard
              profile={currentProfile}
              isGuest={isGuest}
              isSaved={savedUids.includes(currentProfile.uid)}
              coffeeChatRecord={coffeeChatRecords[currentProfile.uid]}
              onToggleSave={onToggleSave}
              onCoffeeChat={handleCoffeeChat}
              onOpenDetails={onOpenDetails}
              onOpenCoffeeChatNote={onOpenCoffeeChatNote}
              onOpenInAppChat={onOpenInAppChat}
              onGuestActionPrompt={onGuestActionPrompt}
              onPreviousClassmate={handlePrevious}
              onNextClassmate={handleNext}
              canGoPrevious={currentIndex > 0}
              canGoNext={currentIndex < deckProfiles.length - 1}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-md mx-auto flex flex-col items-center justify-start pt-0 pb-1">
      {/* Cards Container with Strict Overflow Clip & Dynamic Viewport Height */}
      <div 
        onClickCapture={handleUserCardInteraction}
        onTouchStartCapture={handleUserCardInteraction}
        className={`relative w-full h-[calc(100dvh-172px)] min-h-[440px] max-h-[520px] overflow-hidden rounded-3xl shadow-2xl transition-transform duration-300 ${
          isShakingAnimation ? 'animate-bounce' : ''
        }`}
      >
        {renderCardContent()}
      </div>

      {/* Clean Navigation Bar Controls with Tactile Shuffle Button */}
      {deckProfiles && deckProfiles.length > 0 && currentIndex < deckProfiles.length && (
        <div className="w-full flex items-center justify-between mt-2 px-1 max-w-sm gap-2">
          {/* Previous Button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`flex items-center space-x-1 px-3 py-2 rounded-xl bg-[#140E26]/90 border border-white/10 text-xs font-semibold transition-all shadow-md shrink-0 backdrop-blur-md ${
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'text-slate-200 hover:text-white hover:border-amber-400/50 cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Prev</span>
          </motion.button>

          {/* Shuffle Button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              requestMotionPermission();
              handleShuffle(false);
            }}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-amber-300 hover:text-white border border-amber-400/40 shadow-lg transition-all cursor-pointer min-w-0 backdrop-blur-md"
            title="Tap to shuffle deck randomly (or shake phone)"
          >
            <Dices className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-bold truncate">Shuffle</span>
          </motion.button>

          {/* Card Counter */}
          <div className="text-xs font-bold text-slate-300 bg-[#140E26]/90 px-2.5 py-2 rounded-xl border border-white/10 shrink-0 font-mono backdrop-blur-md">
            <span className="text-amber-400">{currentIndex + 1}</span>
            <span className="text-slate-500">/</span>
            <span>{deckProfiles.length}</span>
          </div>

          {/* Next Button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleNext}
            disabled={currentIndex >= deckProfiles.length - 1}
            className={`flex items-center space-x-1 px-3 py-2 rounded-xl bg-[#140E26]/90 border border-white/10 text-xs font-semibold transition-all shadow-md shrink-0 backdrop-blur-md ${
              currentIndex >= deckProfiles.length - 1
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'text-slate-200 hover:text-white hover:border-amber-400/50 cursor-pointer'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </motion.button>
        </div>
      )}

      {/* Subtle Shake to Shuffle micro-indicator */}
      {deckProfiles && deckProfiles.length > 1 && (
        <button
          type="button"
          onClick={() => {
            requestMotionPermission();
            handleShuffle(false);
          }}
          className="flex items-center justify-center gap-1.5 mt-2 py-1 px-3 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-slate-400 hover:text-amber-300 transition-all cursor-pointer group"
          title="Shake your physical phone to shuffle, or tap here"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400/80 group-hover:scale-110 transition-transform" />
          <span>Shake phone to shuffle deck</span>
        </button>
      )}

    </div>
  );
};

