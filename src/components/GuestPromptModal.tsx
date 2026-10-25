import React from 'react';
import { Lock, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { SectionFWordmark } from './SectionFWordmark';

interface GuestPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  actionName?: string;
}

export const GuestPromptModal: React.FC<GuestPromptModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  actionName = 'Feature Access',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-[#0B0813]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#171226] border border-[#F59E0B]/40 rounded-3xl p-6 shadow-2xl relative text-center flex flex-col items-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock / Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#581C87] border-2 border-[#F59E0B] flex items-center justify-center mb-3 shadow-lg">
          <Lock className="w-7 h-7 text-[#F59E0B]" />
        </div>

        {/* Header Titles */}
        <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest block mb-1">
          Guest Account Limitation
        </span>
        <h3 className="text-lg font-bold text-white mb-2">
          Sign In for Full Access
        </h3>

        <p className="text-xs text-slate-300 mb-3.5">
          Restricted contact info, socials, and family details are reserved for signed-in classmates.
        </p>

        {/* Perks list - Compact single rows */}
        <div className="w-full bg-[#0B0813] rounded-2xl p-3 border border-[#2E244A] mb-4 text-left space-y-1.5">
          <div className="flex items-center space-x-2 text-xs text-slate-200">
            <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span className="truncate">Unlock Instagram & LinkedIn handles</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-200">
            <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span className="truncate">View Partner, spouse & family details</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-200">
            <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span className="truncate">Direct WhatsApp & verified connections</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-200">
            <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span className="truncate">Create & publish your own Section F Card</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          <button
            onClick={() => {
              onClose();
              onSignIn();
            }}
            className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xl border border-[#F59E0B]/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <span>Sign In to Have Full Access</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Continue as Guest
          </button>
        </div>

      </div>
    </div>
  );
};

