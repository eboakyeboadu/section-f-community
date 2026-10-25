import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, X, Mail, MessageSquare, MessageCircle, ChevronDown, ArrowUpRight } from 'lucide-react';
import { Profile } from '../types';
import { playChimeSound, playTapSound } from '../utils/soundEffects';

export type InviteChannel = 'email' | 'whatsapp' | 'in_app';

interface CoffeeChatInviteModalProps {
  isOpen: boolean;
  recipient: Profile | null;
  currentUserProfile: Profile | null;
  onClose: () => void;
  onSendInvite: (invitePayload: {
    proposedDate: string;
    proposedTime: string;
    location: string;
    templateType: 'casual' | 'career' | 'interests' | 'custom';
    channel: InviteChannel;
    message: string;
    subject: string;
  }) => Promise<void>;
  onOpenInAppChat?: (recipient: Profile) => void;
}

export const CoffeeChatInviteModal: React.FC<CoffeeChatInviteModalProps> = ({
  isOpen,
  recipient,
  currentUserProfile,
  onClose,
  onSendInvite,
  onOpenInAppChat,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<InviteChannel | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [proposedSlot, setProposedSlot] = useState<string>('Friday after cases');

  if (!isOpen || !recipient) return null;

  const recipientFirst = recipient.nickname || recipient.fullName.split(' ')[0];
  const senderName = currentUserProfile?.fullName || 'Your Section F Classmate';

  const hasWhatsApp = Boolean(recipient?.whatsapp && !recipient?.notOnWhatsApp);

  // Message templates
  const emailSubject = `Coffee Chat — ${senderName} & ${recipientFirst}`;
  
  const emailMessage = `Hey ${recipientFirst},\r\n\r\nI saw your Section F card and would love to grab coffee sometime! Are you free ${proposedSlot.trim() || '[Day/Time]'} at Spangler?\r\n\r\nLet me know if that works or if another time suits your schedule better.\r\n\r\nBest,\r\n${senderName}`;

  const whatsAppMessage = `Hey ${recipientFirst}! Would love to grab coffee. Are you free ${proposedSlot.trim() || 'Friday after cases'} at Spangler? Let me know! — ${senderName}`;

  const inAppMessage = `Hey ${recipientFirst}! Would love to grab coffee. Are you free ${proposedSlot.trim() || 'Friday after cases'} at Spangler?`;

  const handleSelectChannel = async (channel: InviteChannel) => {
    if (isSending) return;
    if (channel === 'whatsapp' && !hasWhatsApp) return;

    setSelectedChannel(channel);
    setIsSending(true);
    playChimeSound();

    try {
      const message = channel === 'email' 
        ? emailMessage 
        : channel === 'whatsapp' 
        ? whatsAppMessage 
        : inAppMessage;

      await onSendInvite({
        proposedDate: proposedSlot.trim() || 'Flexible',
        proposedTime: 'Spangler',
        location: 'Spangler Grille',
        templateType: 'casual',
        channel,
        message,
        subject: emailSubject,
      });

      if (channel === 'in_app' && onOpenInAppChat) {
        onOpenInAppChat(recipient);
      }
      onClose();
    } catch (err) {
      console.error('Failed to dispatch invite:', err);
    } finally {
      setIsSending(false);
      setSelectedChannel(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={() => {
          playTapSound();
          onClose();
        }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#140E26] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-4 text-left relative overflow-hidden backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row - Slim and compact */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-400/60 shadow shrink-0 bg-[#2E244A] flex items-center justify-center">
                {recipient.photoUrl ? (
                  <img src={recipient.photoUrl} alt={recipient.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-xs">{recipient.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                  <span>Coffee Chat with {recipientFirst}</span>
                  <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </h3>
                <p className="text-[10px] text-slate-400 truncate">
                  Send invite via WhatsApp, Email, or In-App
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playTapSound();
                onClose();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Compact proposed day/time slot */}
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300">
              <span>Proposed Day & Time:</span>
              <span className="text-[10px] text-amber-400 font-normal">Editable</span>
            </div>
            <input
              type="text"
              value={proposedSlot}
              onChange={(e) => setProposedSlot(e.target.value)}
              placeholder="e.g. Friday after cases, Spangler"
              className="w-full bg-[#0B0813] border border-white/10 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Action Options - 3 Slim Single-Row Buttons */}
          <div className="mt-2.5 space-y-1.5">
            {/* 1. WhatsApp Option */}
            <motion.button
              type="button"
              disabled={!hasWhatsApp || isSending}
              whileTap={hasWhatsApp && !isSending ? { scale: 0.98 } : {}}
              onClick={() => handleSelectChannel('whatsapp')}
              className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                hasWhatsApp
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/30 hover:border-emerald-400/50 text-white shadow-sm'
                  : 'bg-white/[0.02] border-white/5 opacity-45 cursor-not-allowed text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    hasWhatsApp
                      ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-white">WhatsApp</span>
                    {hasWhatsApp && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Instant
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                {isSending && selectedChannel === 'whatsapp' ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : hasWhatsApp ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-slate-500">Not on WhatsApp</span>
                )}
              </div>
            </motion.button>

            {/* 2. Email Option */}
            <motion.button
              type="button"
              disabled={isSending}
              whileTap={!isSending ? { scale: 0.98 } : {}}
              onClick={() => handleSelectChannel('email')}
              className="w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/30 hover:border-amber-400/50 text-white shadow-sm"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-white">Email</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Draft
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                {isSending && selectedChannel === 'email' ? (
                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
            </motion.button>

            {/* 3. In-App Direct Messages Option */}
            <motion.button
              type="button"
              disabled={isSending}
              whileTap={!isSending ? { scale: 0.98 } : {}}
              onClick={() => handleSelectChannel('in_app')}
              className="w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer bg-purple-950/40 hover:bg-purple-900/60 border-purple-500/30 hover:border-purple-400/50 text-white shadow-sm"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/30">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-white">In-App Direct Message</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Chat
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                {isSending && selectedChannel === 'in_app' ? (
                  <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                )}
              </div>
            </motion.button>
          </div>

          {/* Subtle Quick Preview Toggle */}
          <div className="mt-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setShowPreview(!showPreview);
              }}
              className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-0.5 cursor-pointer"
            >
              <span>View message text</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showPreview ? 'rotate-180 text-amber-400' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-2.5 rounded-lg bg-black/40 border border-white/10 text-[10.5px] leading-relaxed text-slate-300 whitespace-pre-line font-mono">
                    {emailMessage}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

