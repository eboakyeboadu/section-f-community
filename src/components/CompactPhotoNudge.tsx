import React, { useState } from 'react';
import { Camera, X, Bell, BellRing, Sparkles, Smartphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  isStandalonePwa, 
  isIosDevice, 
  getNotificationPermission, 
  requestNotificationPermission 
} from '../services/pushNotificationService';
import { sendTestPhotoReminder } from '../services/photoReminderService';
import { playTapSound, playPopSound } from '../utils/soundEffects';

interface CompactPhotoNudgeProps {
  onAddPhoto: () => void;
  userUid?: string;
}

export const CompactPhotoNudge: React.FC<CompactPhotoNudgeProps> = ({
  onAddPhoto,
  userUid
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showNotificationTip, setShowNotificationTip] = useState(false);
  const [notificationState, setNotificationState] = useState<string>(() => getNotificationPermission());
  const [testSent, setTestSent] = useState(false);

  if (isDismissed) return null;

  const isStandalone = isStandalonePwa();
  const isIos = isIosDevice();

  const handleEnablePush = async () => {
    playTapSound();
    const result = await requestNotificationPermission(userUid);
    setNotificationState(getNotificationPermission());
    if (!result.granted && result.error) {
      alert(result.error);
    }
  };

  const handleTestReminder = async () => {
    playPopSound();
    setTestSent(true);
    await sendTestPhotoReminder('2h');
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="w-full px-3 sm:px-4 py-2">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border border-amber-500/30 p-2.5 sm:p-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between gap-2.5">
          {/* Icon & Message */}
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <Camera className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-amber-300 tracking-wide uppercase">Profile Incomplete</span>
                <span className="inline-block w-1 h-1 rounded-full bg-amber-400/60" />
                <span className="text-[11px] text-slate-400 truncate">Missing Photo</span>
              </div>
              <p className="text-[12px] text-slate-200 font-medium truncate">
                Add a headshot so your classmates recognize you!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onAddPhoto();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1"
            >
              <span>Add Photo</span>
            </button>

            {/* Notification reminder trigger / toggle */}
            {notificationState !== 'granted' ? (
              <button
                type="button"
                onClick={() => setShowNotificationTip(!showNotificationTip)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                title="Enable Push Reminders"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestReminder}
                disabled={testSent}
                className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                title="Notifications active. Click to test preview."
              >
                {testSent ? <Check className="w-3.5 h-3.5" /> : <BellRing className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setIsDismissed(true);
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
              title="Dismiss for now"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Notification Setup Tip (Minimal, Modern) */}
        <AnimatePresence>
          {showNotificationTip && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 pt-2.5 border-t border-white/10 text-xs text-slate-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start space-x-2">
                  <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-100">
                      Automatic 2-Hour & 3-Day Photo Reminders
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isIos && !isStandalone ? (
                        <>To receive reminders on iPhone, tap <strong>Share</strong> → <strong>Add to Home Screen</strong> first.</>
                      ) : (
                        <>Get a gentle reminder if you don't upload a photo today. Disarms automatically once uploaded.</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {(!isIos || isStandalone) && (
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] cursor-pointer transition-colors"
                    >
                      Enable Reminders
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotificationTip(false)}
                    className="text-slate-400 hover:text-slate-200 text-[11px] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

