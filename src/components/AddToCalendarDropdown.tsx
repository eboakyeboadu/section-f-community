import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  ChevronDown, 
  Download, 
  ExternalLink, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { 
  CalendarEventParams, 
  getGoogleCalendarUrl, 
  getOutlookCalendarUrl, 
  downloadIcsFile 
} from '../utils/calendarExport';
import { playTapSound } from '../utils/soundEffects';

interface AddToCalendarDropdownProps {
  event: CalendarEventParams;
  variant?: 'button' | 'icon' | 'compact';
  align?: 'left' | 'right';
  className?: string;
  label?: string;
}

export const AddToCalendarDropdown: React.FC<AddToCalendarDropdownProps> = ({
  event,
  variant = 'button',
  align = 'right',
  className = '',
  label = 'Add to Calendar',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpenGoogle = () => {
    playTapSound();
    const url = getGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleOpenOutlook = () => {
    playTapSound();
    const url = getOutlookCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleDownloadIcs = () => {
    playTapSound();
    downloadIcsFile(event);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger button */}
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setIsOpen(!isOpen);
          }}
          title="Add to Google / Outlook / Apple Calendar"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-amber-400" />
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setIsOpen(!isOpen);
          }}
          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>Cal</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setIsOpen(!isOpen);
          }}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/15 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>{label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Floating Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 mt-1.5 w-60 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#19122C] border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.6)] p-1.5 backdrop-blur-xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="px-3 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5">
              Sync to your personal calendar
            </div>

            {/* Google Calendar */}
            <button
              type="button"
              onClick={handleOpenGoogle}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30">
                  G
                </div>
                <div>
                  <div className="text-white font-bold group-hover:text-amber-300 transition-colors">
                    Google Calendar
                  </div>
                  <div className="text-[10px] text-slate-400">Opens Google Calendar web</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
            </button>

            {/* Outlook */}
            <button
              type="button"
              onClick={handleOpenOutlook}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer group mt-0.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold border border-sky-500/30">
                  O
                </div>
                <div>
                  <div className="text-white font-bold group-hover:text-amber-300 transition-colors">
                    Outlook
                  </div>
                  <div className="text-[10px] text-slate-400">Opens Outlook calendar</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
            </button>

            {/* Apple / Outlook Desktop / .ics Download */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer group mt-0.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold border border-purple-500/30">
                  
                </div>
                <div>
                  <div className="text-white font-bold group-hover:text-amber-300 transition-colors">
                    Apple & Desktop (.ics)
                  </div>
                  <div className="text-[10px] text-slate-400">Apple Cal, iOS & Outlook app</div>
                </div>
              </div>
              {downloaded ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

