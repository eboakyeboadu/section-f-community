import React, { useState, useMemo } from 'react';
import { 
  Coffee, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Search, 
  Plus, 
  Edit3, 
  Mail, 
  ExternalLink, 
  FileText, 
  ChevronRight,
  Users,
  Lock,
  MessageSquare,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { Profile, CoffeeChatRecord, CoffeeChatStatus, CoffeeChatInvitation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playChimeSound, playTapSound } from '../utils/soundEffects';
import { AddToCalendarDropdown } from './AddToCalendarDropdown';

interface CoffeeChatHistoryViewProps {
  profiles: Profile[];
  coffeeChatRecords: Record<string, CoffeeChatRecord>;
  onOpenDetails: (profile: Profile) => void;
  onOpenNoteModal: (profile: Profile) => void;
  onInitiateCoffeeChat: (profile: Profile) => void;
  isGuest?: boolean;
  incomingInvitations?: CoffeeChatInvitation[];
  onAcceptInvitation?: (invitation: CoffeeChatInvitation) => void;
  onOpenInAppChat?: (profile: Profile) => void;
  onDeleteCoffeeChatRecord?: (classmateUid: string) => void;
  onSaveNotes?: (
    classmateUid: string,
    updates: {
      status?: CoffeeChatStatus;
      notes?: string;
      takeaways?: string[];
      locationOrTopic?: string;
      completedAt?: string;
      scheduledDate?: string;
      scheduledTime?: string;
    }
  ) => void;
}

type FilterTab = 'all' | 'completed' | 'pending';

export const CoffeeChatHistoryView: React.FC<CoffeeChatHistoryViewProps> = ({
  profiles,
  coffeeChatRecords,
  onOpenDetails,
  onOpenNoteModal,
  onInitiateCoffeeChat,
  isGuest = false,
  incomingInvitations = [],
  onAcceptInvitation,
  onOpenInAppChat,
  onDeleteCoffeeChatRecord,
  onSaveNotes,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [itemToDelete, setItemToDelete] = useState<{ uid: string; name: string } | null>(null);

  // Combine profiles that have records
  const trackedItems = useMemo(() => {
    const list: Array<{
      profile: Profile;
      record: CoffeeChatRecord;
    }> = [];

    Object.values(coffeeChatRecords).forEach((rec) => {
      const match = profiles.find((p) => p.uid === rec.classmateUid);
      if (match && rec.status !== 'none') {
        list.push({ profile: match, record: rec });
      }
    });

    // Sort by latest updated / completed
    return list.sort((a, b) => {
      const dateA = a.record.completedAt || a.record.requestedAt || a.record.updatedAt;
      const dateB = b.record.completedAt || b.record.requestedAt || b.record.updatedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [profiles, coffeeChatRecords]);

  // Statistics
  const completedCount = useMemo(() => {
    return trackedItems.filter((item) => item.record.status === 'completed').length;
  }, [trackedItems]);

  const pendingCount = useMemo(() => {
    return trackedItems.filter((item) => item.record.status === 'request_sent' || item.record.status === 'scheduled').length;
  }, [trackedItems]);

  // Filtered list by tab and search
  const filteredItems = useMemo(() => {
    return trackedItems.filter((item) => {
      // Tab filter
      if (activeTab === 'completed' && item.record.status !== 'completed') return false;
      if (activeTab === 'pending' && item.record.status !== 'request_sent' && item.record.status !== 'scheduled') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.profile.fullName.toLowerCase().includes(q);
        const notesMatch = (item.record.notes || '').toLowerCase().includes(q);
        const topicMatch = (item.record.locationOrTopic || '').toLowerCase().includes(q);
        const takeawayMatch = (item.record.takeaways || []).some((t) => t.toLowerCase().includes(q));
        const companyMatch = item.profile.preHbsCompany.toLowerCase().includes(q);
        return nameMatch || notesMatch || topicMatch || takeawayMatch || companyMatch;
      }

      return true;
    });
  }, [trackedItems, activeTab, searchQuery]);

  const getStatusBadge = (status: CoffeeChatStatus) => {
    switch (status) {
      case 'completed':
        return (
          <motion.span
            layout
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Completed</span>
          </motion.span>
        );
      case 'scheduled':
        return (
          <motion.span
            layout
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-500/30 shadow-sm"
          >
            <Calendar className="w-3 h-3 text-purple-300" />
            <span>Scheduled</span>
          </motion.span>
        );
      case 'request_sent':
        return (
          <motion.span
            layout
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Request Sent</span>
          </motion.span>
        );
      default:
        return null;
    }
  };

  if (isGuest) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-6 text-slate-100 text-center px-4 animate-fadeIn">
        <div className="bg-[#171226] p-6 rounded-3xl border border-[#2E244A] shadow-xl flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#581C87] border-2 border-[#F59E0B] flex items-center justify-center mb-3 shadow-lg">
            <Lock className="w-7 h-7 text-[#F59E0B]" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Member Access Required</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
            Direct classmate connections, meeting history, and private takeaways are reserved for verified Section F members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-3.5 pb-20 pt-1 text-slate-100">
      
      {/* Top Banner & Metric Counters */}
      <div className="bg-gradient-to-r from-[#581C87] via-[#2E244A] to-[#171226] p-4 rounded-3xl border border-[#581C87]/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-15">
          <Coffee className="w-24 h-24 text-[#F59E0B]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-1">
            <div className="p-1.5 rounded-xl bg-[#F59E0B] text-[#0B0813]">
              <Coffee className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Coffee Chat History & Notes
            </h2>
          </div>
          <p className="text-xs text-slate-300 truncate mb-3">
            Track invites, meetups & private takeaways
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0B0813]/60 backdrop-blur-md p-2 rounded-2xl border border-[#2E244A] text-center">
              <span className="text-lg font-black text-[#F59E0B] block leading-tight font-mono">
                {completedCount}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Completed</span>
            </div>

            <div className="bg-[#0B0813]/60 backdrop-blur-md p-2 rounded-2xl border border-[#2E244A] text-center">
              <span className="text-lg font-black text-amber-300 block leading-tight font-mono">
                {pendingCount}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">In Progress</span>
            </div>

            <div className="bg-[#0B0813]/60 backdrop-blur-md p-2 rounded-2xl border border-[#2E244A] text-center">
              <span className="text-lg font-black text-purple-300 block leading-tight font-mono">
                {trackedItems.length}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Total Tracked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Incoming Invitations Banner (if any received) */}
      {incomingInvitations.length > 0 && (
        <div className="bg-[#150E26] rounded-2xl border border-amber-400/40 p-3.5 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Incoming Coffee Chat Invites ({incomingInvitations.length})
              </h3>
            </div>
            <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
              Needs Response
            </span>
          </div>

          <div className="space-y-2">
            {incomingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-[#0B0813] p-2.5 rounded-xl border border-white/10 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-amber-400/50 bg-[#2E244A] flex items-center justify-center shrink-0">
                      {inv.senderPhoto ? (
                        <img src={inv.senderPhoto} alt={inv.senderName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-[10px] font-bold">{inv.senderName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{inv.senderName}</p>
                      <p className="text-[10.5px] text-amber-300 flex items-center space-x-1 truncate">
                        {inv.proposedDate && inv.proposedDate !== 'Flexible' ? (
                          <>
                            <span>{inv.proposedDate}</span>
                            <span>•</span>
                            <span>{inv.proposedTime}</span>
                          </>
                        ) : (
                          <span>Flexible Timing</span>
                        )}
                        {inv.location && inv.location !== 'Flexible' && (
                          <>
                            <span>•</span>
                            <span>{inv.location}</span>
                          </>
                        )}
                        {inv.channel && (
                          <>
                            <span>•</span>
                            <span className={inv.channel === 'whatsapp' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                              {inv.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {onOpenInAppChat && (() => {
                      const senderProfile = profiles.find((p) => p.uid === inv.senderUid);
                      if (!senderProfile) return null;
                      return (
                        <button
                          onClick={() => {
                            playTapSound();
                            onOpenInAppChat(senderProfile);
                          }}
                          className="py-1 px-2 rounded-lg bg-[#2E244A] hover:bg-[#3B2560] text-purple-200 hover:text-white border border-purple-500/30 text-[10.5px] font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3 text-[#F59E0B]" />
                          <span>Chat</span>
                        </button>
                      );
                    })()}

                    {inv.status === 'pending' && onAcceptInvitation && (
                      <button
                        onClick={() => {
                          playChimeSound();
                          onAcceptInvitation(inv);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-[10.5px] shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="space-y-2">
        <div className="flex p-1 bg-[#120B24]/90 backdrop-blur-2xl rounded-2xl border border-white/10 relative shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('all');
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer relative z-10 ${
              activeTab === 'all' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'all' && (
              <motion.div
                layoutId="coffeeFilterPill"
                className="absolute inset-0 rounded-xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
              />
            )}
            <span className="relative z-10">All ({trackedItems.length})</span>
          </button>
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('completed');
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer relative z-10 ${
              activeTab === 'completed' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'completed' && (
              <motion.div
                layoutId="coffeeFilterPill"
                className="absolute inset-0 rounded-xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
              />
            )}
            <span className="relative z-10">Completed ({completedCount})</span>
          </button>
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('pending');
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer relative z-10 ${
              activeTab === 'pending' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'pending' && (
              <motion.div
                layoutId="coffeeFilterPill"
                className="absolute inset-0 rounded-xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
              />
            )}
            <span className="relative z-10">In Progress ({pendingCount})</span>
          </button>
        </div>

        {/* Search within tracked chats */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, classmates, takeaways..."
            className="w-full bg-[#171226] text-white text-xs pl-8 pr-8 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none placeholder-slate-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Coffee Chat Cards List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-[#171226]/60 border border-[#2E244A] space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#581C87]/40 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
            <Coffee className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-white">No Coffee Chats in this View</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {trackedItems.length === 0
              ? 'When you invite classmates to a coffee chat on their card, they will automatically appear here with their status and notes!'
              : 'No classmates match your current search or tab filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(({ profile, record }) => (
              <motion.div
                layout
                key={profile.uid}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                onClick={() => onOpenNoteModal(profile)}
                className="p-3.5 rounded-2xl bg-[#171226] border border-[#2E244A] hover:border-[#F59E0B]/50 transition-colors shadow-lg space-y-2.5 text-left cursor-pointer group/card"
              >
                {/* Header: Classmate info & status */}
                <div className="flex items-start justify-between gap-2">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetails(profile);
                  }}
                  className="flex items-center space-x-2.5 min-w-0 cursor-pointer group/avatar"
                  title="Click to view full classmate profile"
                >
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#2E244A] group-hover/avatar:border-[#F59E0B] transition-colors shrink-0">
                    {profile.photoUrl && profile.photoUrl.trim() !== '' ? (
                      <img src={profile.photoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#581C87] flex items-center justify-center font-bold text-white text-xs">
                        {profile.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover/avatar:text-[#F59E0B] transition-colors truncate">
                      {profile.fullName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {profile.preHbsRole} • {profile.preHbsCompany}
                    </p>
                  </div>
                </div>

                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNoteModal(profile);
                  }}
                  className="shrink-0 flex flex-col items-end space-y-1"
                >
                  {getStatusBadge(record.status)}
                </div>
              </div>

              {/* Scheduled Time Banner if available */}
              {record.status === 'scheduled' && record.scheduledDate && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="bg-purple-950/40 px-2.5 py-1.5 rounded-xl border border-purple-500/25 text-xs text-purple-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="font-medium">
                      Scheduled for {record.scheduledDate}{record.scheduledTime ? ` at ${record.scheduledTime}` : ''}
                    </span>
                  </div>
                  <AddToCalendarDropdown
                    event={{
                      title: `Coffee Chat with ${profile.fullName}`,
                      description: `HBS Section F Coffee Chat with ${profile.fullName} (${profile.preHbsRole} at ${profile.preHbsCompany}). ${record.notes ? `Notes: ${record.notes}` : ''}`,
                      location: record.locationOrTopic || 'Spangler Grille or Chao Center',
                      date: record.scheduledDate,
                      time: record.scheduledTime || '14:00',
                    }}
                    variant="compact"
                    align="right"
                  />
                </div>
              )}

              {/* Location or Topic badge */}
              {record.locationOrTopic && (
                <div className="bg-[#0B0813] px-2.5 py-1 rounded-lg border border-[#2E244A]/80 text-[11px] text-purple-200">
                  <span className="font-semibold text-slate-400 mr-1.5">Focus:</span>
                  <span>{record.locationOrTopic}</span>
                </div>
              )}

              {/* Key Takeaways Preview */}
              {record.takeaways && record.takeaways.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Takeaways:
                  </span>
                  <div className="space-y-1">
                    {record.takeaways.map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-1.5 text-xs text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1 shrink-0" />
                        <span className="leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Notes Preview */}
              {record.notes && (
                <div className="bg-[#0B0813]/60 p-2.5 rounded-xl border border-[#2E244A]/60 text-xs text-slate-300">
                  <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-400 mb-0.5">
                    <FileText className="w-3 h-3 text-[#F59E0B]" />
                    <span>Notes</span>
                  </div>
                  <p className="leading-relaxed line-clamp-3 italic">"{record.notes}"</p>
                </div>
              )}

              {/* Bottom Actions Bar - Responsive wrap so elements never collide on small screens */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-[#2E244A]/60 text-xs">
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                  {record.completedAt
                    ? `Done: ${new Date(record.completedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}`
                    : record.requestedAt
                    ? `Sent: ${new Date(record.requestedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}`
                    : ''}
                </span>

                <div className="flex items-center space-x-1.5 ml-auto">
                  {/* If scheduled without a scheduledDate banner above, provide calendar button */}
                  {record.status === 'scheduled' && !record.scheduledDate && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <AddToCalendarDropdown
                        event={{
                          title: `Coffee Chat with ${profile.fullName}`,
                          description: `HBS Section F Coffee Chat with ${profile.fullName} (${profile.preHbsRole} at ${profile.preHbsCompany}). ${record.notes ? `Notes: ${record.notes}` : ''}`,
                          location: record.locationOrTopic || 'Spangler Grille or Chao Center',
                          date: new Date().toISOString().split('T')[0],
                          time: '14:00',
                        }}
                        variant="compact"
                        align="right"
                      />
                    </div>
                  )}

                  {onOpenInAppChat && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapSound();
                        onOpenInAppChat(profile);
                      }}
                      className="py-1 px-2 rounded-lg bg-[#2E244A] hover:bg-[#3B2560] text-purple-200 hover:text-white border border-purple-500/30 font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer min-h-[32px]"
                      title={`Message ${profile.fullName}`}
                    >
                      <MessageSquare className="w-3 h-3 text-[#F59E0B]" />
                      <span>Chat</span>
                    </button>
                  )}

                  {/* Quick Mark Done Button for counterparties */}
                  {record.status !== 'completed' && onSaveNotes && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playChimeSound();
                        onSaveNotes(profile.uid, {
                          status: 'completed',
                          completedAt: new Date().toISOString(),
                        });
                      }}
                      className="py-1 px-2.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/40 font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer min-h-[32px] active:scale-95 shadow-sm"
                      title={`Mark coffee chat with ${profile.fullName} as completed`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Mark Done</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNoteModal(profile);
                    }}
                    className="py-1 px-2 rounded-lg bg-[#581C87]/60 hover:bg-[#581C87] text-[#F59E0B] hover:text-white border border-[#F59E0B]/30 font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer min-h-[32px]"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Notes</span>
                  </button>

                  {onDeleteCoffeeChatRecord && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapSound();
                        setItemToDelete({ uid: profile.uid, name: profile.fullName });
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
                      title={`Remove coffee chat history with ${profile.fullName}`}
                      aria-label={`Remove coffee chat history with ${profile.fullName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNoteModal(profile);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-[#F59E0B] hover:bg-white/10 transition-colors min-h-[32px] flex items-center justify-center"
                    title="Open Coffee Chat Profile & Notes"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* In-App Coffee Chat Deletion Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setItemToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-[#171226] border border-rose-500/30 rounded-2xl p-5 shadow-2xl relative text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Delete Coffee Chat History?
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Remove recorded coffee chat history and notes for <strong className="text-white">{itemToDelete.name}</strong> from your tracker?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    if (onDeleteCoffeeChatRecord) {
                      onDeleteCoffeeChatRecord(itemToDelete.uid);
                    }
                    setItemToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 transition-all cursor-pointer active:scale-95"
                >
                  Yes, Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

