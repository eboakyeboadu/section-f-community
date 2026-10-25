import React from 'react';
import { motion } from 'motion/react';
import { Coffee, X } from 'lucide-react';
import { Profile } from '../types';
import { playChimeSound, playTapSound } from '../utils/soundEffects';

interface CoffeeChatVerificationModalProps {
  isOpen: boolean;
  profile: Profile | null;
  onConfirmSent: () => void;
  onDismiss: () => void;
  onDidNotSend?: () => void;
}

export const CoffeeChatVerificationModal: React.FC<CoffeeChatVerificationModalProps> = ({
  isOpen,
  profile,
  onConfirmSent,
  onDismiss,
  onDidNotSend,
}) => {
  if (!isOpen || !profile) return null;

  const handleDeclineOrClose = () => {
    playTapSound();
    if (onDidNotSend) {
      onDidNotSend();
    } else {
      onDismiss();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={handleDeclineOrClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className="w-full max-w-xs rounded-3xl bg-[#150E26]/95 border border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.12)] p-5 text-center relative overflow-hidden backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-purple-600/20 rounded-full blur-xl pointer-events-none" />

        {/* Close icon button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleDeclineOrClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </motion.button>

        {/* Avatar badge */}
        <div className="relative mx-auto mb-3 w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md">
          {profile.photoUrl && profile.photoUrl.trim() !== '' ? (
            <img src={profile.photoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#2E244A] flex items-center justify-center text-white font-bold text-base">
              {profile.fullName.charAt(0)}
            </div>
          )}
          <div className="absolute bottom-0 right-0 p-0.5 bg-amber-400 text-slate-950 rounded-tl-lg">
            <Coffee className="w-2.5 h-2.5" />
          </div>
        </div>

        <p className="text-sm text-white font-medium mb-5 px-1 leading-snug">
          Did you send the coffee chat invite to <span className="text-amber-400 font-bold">{profile.fullName}</span>?
        </p>

        {/* Clean, minimal responses: No & Yes with spring taps */}
        <div className="grid grid-cols-2 gap-2.5">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleDeclineOrClose}
            className="py-2.5 px-4 rounded-xl bg-[#0B0813] hover:bg-[#2E244A] border border-white/10 text-slate-300 hover:text-white font-bold text-sm transition-colors cursor-pointer"
          >
            No
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              playChimeSound();
              onConfirmSent();
            }}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Yes
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

