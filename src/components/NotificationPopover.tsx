import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, Calendar, Clock, MapPin, Mail, Check, X, Bell, ExternalLink, MessageSquare } from 'lucide-react';
import { CoffeeChatInvitation, ChatMessage } from '../types';
import { playChimeSound, playTapSound } from '../utils/soundEffects';

interface NotificationPopoverProps {
  isOpen: boolean;
  invitations: CoffeeChatInvitation[];
  unreadMessages?: ChatMessage[];
  onClose: () => void;
  onAccept: (invitation: CoffeeChatInvitation) => Promise<void>;
  onDecline: (invitation: CoffeeChatInvitation) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onSelectClassmateProfile?: (uid: string) => void;
  onOpenChatWithSender?: (senderUid: string) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  invitations,
  unreadMessages = [],
  onClose,
  onAccept,
  onDecline,
  onMarkAllRead,
  onSelectClassmateProfile,
  onOpenChatWithSender,
}) => {
  if (!isOpen) return null;

  const unreadInvitesCount = invitations.filter((inv) => !inv.read).length;
  const unreadMessagesCount = unreadMessages.length;
  const totalUnreadCount = unreadInvitesCount + unreadMessagesCount;

  const handleReply = (inv: CoffeeChatInvitation) => {
    playTapSound();
    if (inv.channel === 'whatsapp' && inv.senderPhone) {
      const cleanPhone = inv.senderPhone.replace(/[^0-9]/g, '');
      const replyMsg = encodeURIComponent(
        `Hey ${inv.senderName.split(' ')[0]}! Thanks for the coffee chat invite for ${inv.proposedDate} at ${inv.proposedTime}. Looking forward to connecting!`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${replyMsg}`, '_blank');
      return;
    }
    const subject = encodeURIComponent(`Re: Coffee Chat - Let's meet at ${inv.location}!`);
    const body = encodeURIComponent(
      `Hey ${inv.senderName.split(' ')[0]},\r\n\r\nThanks for sending the coffee chat invite for ${inv.proposedDate} at ${inv.proposedTime}! That works great for me / Looking forward to connecting.\r\n\r\nBest!`
    );
    window.location.href = `mailto:${encodeURIComponent(inv.senderEmail)}?subject=${subject}&body=${body}`;
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
        onClick={() => {
          playTapSound();
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
          className="absolute top-16 right-3 sm:right-6 w-[calc(100vw-24px)] max-w-sm rounded-2xl bg-[#140E26]/95 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-2xl overflow-hidden z-50 text-white select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">Notifications</h3>
                <p className="text-[10px] text-slate-400">
                  {invitations.length + unreadMessages.length} total • {totalUnreadCount} unread
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {unreadInvitesCount > 0 && (
                <button
                  onClick={() => {
                    playTapSound();
                    onMarkAllRead();
                  }}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  Mark invites read
                </button>
              )}
              <button
                onClick={() => {
                  playTapSound();
                  onClose();
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages & Invitation List */}
          <div className="max-h-[70vh] overflow-y-auto no-scrollbar divide-y divide-white/10">
            {/* New Unread In-App Messages */}
            {unreadMessages.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-purple-950/60 to-[#1e1338] border-b border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-purple-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Messages ({unreadMessages.length})</span>
                  </span>
                </div>
                <div className="space-y-1.5">
                  {unreadMessages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => {
                        playTapSound();
                        onOpenChatWithSender?.(msg.senderUid);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl bg-[#0E091C]/90 hover:bg-[#1A1230] border border-purple-500/30 flex items-center justify-between gap-2 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-[#F59E0B]/50 bg-[#2E244A] flex items-center justify-center shrink-0">
                          {msg.senderPhoto ? (
                            <img src={msg.senderPhoto} alt={msg.senderName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-[10px] font-bold">{msg.senderName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {msg.senderName}
                          </p>
                          <p className="text-[11px] text-slate-300 truncate">
                            "{msg.message}"
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#581C87] text-white font-bold shrink-0">
                        Reply
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invitations.length === 0 && unreadMessages.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#2E244A]/40 border border-white/10 flex items-center justify-center mx-auto mb-3 text-amber-400">
                  <Coffee className="w-6 h-6 opacity-75" />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">No Notifications Yet</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                  When a Section F classmate invites you for coffee or sends you a direct message, you'll be notified here instantly!
                </p>
              </div>
            ) : (
              invitations.map((inv) => (
                <div
                  key={inv.id}
                  className={`p-3.5 transition-colors ${
                    !inv.read ? 'bg-amber-400/[0.04]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-amber-400/60 bg-[#2E244A] flex items-center justify-center shrink-0">
                        {inv.senderPhoto ? (
                          <img src={inv.senderPhoto} alt={inv.senderName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-xs">{inv.senderName.charAt(0)}</span>
                        )}
                        <span className="absolute bottom-0 right-0 p-0.5 bg-amber-400 text-slate-950 rounded-tl-sm">
                          <Coffee className="w-2 h-2" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-bold text-white truncate">{inv.senderName}</p>
                          {!inv.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {formatTimestamp(inv.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        inv.status === 'accepted'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : inv.status === 'declined'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                          : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {inv.status === 'accepted'
                        ? 'Accepted'
                        : inv.status === 'declined'
                        ? 'Declined'
                        : 'Proposed'}
                    </span>
                  </div>

                  {/* Proposed Meeting Details */}
                  <div className="bg-[#0B0716] rounded-xl p-2.5 border border-white/10 space-y-1.5 mb-2.5 text-[11px]">
                    {inv.proposedDate && inv.proposedDate !== 'Flexible' ? (
                      <div className="flex items-center space-x-1.5 text-amber-300">
                        <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="font-semibold">{inv.proposedDate}</span>
                        <span className="text-slate-500">•</span>
                        <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="text-slate-200">{inv.proposedTime}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-amber-300 font-medium">
                        <Coffee className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Open & Flexible Timing</span>
                        {inv.channel && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className={inv.channel === 'whatsapp' ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
                              via {inv.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {inv.location && inv.location !== 'Flexible' && (
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{inv.location}</span>
                      </div>
                    )}

                    {/* Message snippet */}
                    {inv.message && (
                      <p className="text-[10.5px] text-slate-400 line-clamp-2 pt-1 border-t border-white/5 italic">
                        "{inv.message.replace(/(\r\n|\n|\r)/gm, " ")}"
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5">
                    {inv.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => {
                            playChimeSound();
                            onAccept(inv);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-[11px] shadow-sm flex items-center justify-center space-x-1 transition-all cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept Invite</span>
                        </button>
                        <button
                          onClick={() => handleReply(inv)}
                          className="py-1.5 px-2 rounded-lg bg-[#2E244A] hover:bg-[#3B2560] text-slate-200 hover:text-white font-bold text-[11px] border border-white/10 flex items-center justify-center space-x-1 transition-all cursor-pointer"
                          title={inv.channel === 'whatsapp' ? 'Reply via WhatsApp' : 'Reply via Email'}
                        >
                          {inv.channel === 'whatsapp' ? (
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Mail className="w-3 h-3 text-amber-400" />
                          )}
                          <span>Reply</span>
                        </button>
                        <button
                          onClick={() => {
                            playTapSound();
                            onDecline(inv);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Decline"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {inv.status === 'accepted' ? 'Coffee chat confirmed!' : 'Invitation declined'}
                        </span>
                        <button
                          onClick={() => handleReply(inv)}
                          className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-[10px] flex items-center space-x-1 cursor-pointer"
                        >
                          {inv.channel === 'whatsapp' ? (
                            <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <Mail className="w-2.5 h-2.5 text-amber-400" />
                          )}
                          <span>{inv.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} {inv.senderName.split(' ')[0]}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

