import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, Clock, X, ArrowRight } from 'lucide-react';
import { PendingCoffeeReminder } from '../utils/coffeeChatReminders';
import { playTapSound } from '../utils/soundEffects';

interface CoffeeChatReminderToastProps {
  reminder: PendingCoffeeReminder | null;
  onUpdateStatus: (reminder: PendingCoffeeReminder) => void;
  onDismiss: (reminder: PendingCoffeeReminder) => void;
}

export const CoffeeChatReminderToast: React.FC<CoffeeChatReminderToastProps> = ({
  reminder,
  onUpdateStatus,
  onDismiss,
}) => {
  if (!reminder) return null;

  const firstName = reminder.profile.nickname || reminder.profile.fullName.split(' ')[0];

  return (
    <AnimatePresence>
      <motion.div
        key={reminder.profile.uid}
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 pointer-events-auto"
      >
        <div className="bg-[#171226]/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl text-left relative overflow-hidden">
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-purple-500 to-amber-500 animate-pulse" />

          <div className="flex items-start gap-3">
            {/* Classmate Avatar or Fallback with Coffee badge */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-500/50 bg-[#2E244A] shadow-md">
                {reminder.profile.photoUrl && reminder.profile.photoUrl.trim() !== '' ? (
                  <img
                    src={reminder.profile.photoUrl}
                    alt={reminder.profile.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-amber-300 text-sm">
                    {reminder.profile.fullName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-[#0B0813] flex items-center justify-center shadow-md border border-[#171226]">
                <Coffee className="w-2.5 h-2.5 stroke-[2.5]" />
              </div>
            </div>

            {/* Content text */}
            <div className="flex-1 min-w-0 pr-5">
              <div className="flex items-center space-x-1.5 text-amber-400 text-[11px] font-semibold mb-0.5">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Invite Sent {reminder.hoursAgo}h ago</span>
              </div>
              <h4 className="text-xs font-bold text-white truncate">
                Coffee Chat with {reminder.profile.fullName}
              </h4>
              <p className="text-[11px] text-slate-300 leading-tight mt-0.5 line-clamp-2">
                Have you and {firstName} heard back or scheduled a time?
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onUpdateStatus(reminder);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] hover:from-[#6B21A8] hover:to-[#9333EA] text-white font-bold text-[11px] flex items-center justify-center space-x-1 border border-amber-400/40 shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  <span>Update Status</span>
                  <ArrowRight className="w-3 h-3 text-amber-300" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onDismiss(reminder);
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-[#2E244A]/80 hover:bg-[#2E244A] text-slate-400 hover:text-white font-medium text-[11px] border border-[#2E244A] cursor-pointer active:scale-95 transition-all"
                >
                  Snooze
                </button>
              </div>
            </div>

            {/* Top-right close button */}
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onDismiss(reminder);
              }}
              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Dismiss reminder"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

