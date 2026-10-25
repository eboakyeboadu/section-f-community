import React, { useState, useEffect, useRef } from 'react';
import { Coffee, CheckCircle2, Clock, Calendar, FileText, Trash2, X, Plus, MessageSquare } from 'lucide-react';
import { Profile, CoffeeChatRecord, CoffeeChatStatus } from '../types';
import { AddToCalendarDropdown } from './AddToCalendarDropdown';
import { playTapSound } from '../utils/soundEffects';

interface CoffeeChatNoteModalProps {
  isOpen: boolean;
  profile: Profile | null;
  record: CoffeeChatRecord | null;
  onClose: () => void;
  onSave: (updates: {
    status?: CoffeeChatStatus;
    notes?: string;
    takeaways?: string[];
    locationOrTopic?: string;
    completedAt?: string;
    scheduledDate?: string;
    scheduledTime?: string;
  }) => void;
  onDeleteRecord?: () => void;
  onOpenInAppChat?: (profile: Profile) => void;
}

export const CoffeeChatNoteModal: React.FC<CoffeeChatNoteModalProps> = ({
  isOpen,
  profile,
  record,
  onClose,
  onSave,
  onDeleteRecord,
  onOpenInAppChat,
}) => {
  const [status, setStatus] = useState<CoffeeChatStatus>(record?.status || 'completed');
  const [scheduledDate, setScheduledDate] = useState<string>(
    record?.scheduledDate || new Date().toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    record?.scheduledTime || '14:00'
  );
  const [notes, setNotes] = useState<string>(record?.notes || '');
  const [takeawayInput, setTakeawayInput] = useState<string>('');
  const [takeaways, setTakeaways] = useState<string[]>(Array.isArray(record?.takeaways) ? record.takeaways : []);
  const [locationOrTopic, setLocationOrTopic] = useState<string>(record?.locationOrTopic || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openedForProfileRef = useRef<string | null>(null);

  // Sync state ONLY when modal opens or the target profile changes.
  // Never re-initialize while the user is actively editing.
  useEffect(() => {
    if (isOpen && profile) {
      if (openedForProfileRef.current !== profile.uid) {
        openedForProfileRef.current = profile.uid;
        setStatus(record?.status || 'completed');
        setScheduledDate(record?.scheduledDate || new Date().toISOString().split('T')[0]);
        setScheduledTime(record?.scheduledTime || '14:00');
        setNotes(record?.notes || '');
        setTakeaways(Array.isArray(record?.takeaways) ? [...record.takeaways] : []);
        setLocationOrTopic(record?.locationOrTopic || '');
        setTakeawayInput('');
        setConfirmDelete(false);
      }
    } else {
      openedForProfileRef.current = null;
    }
  }, [isOpen, profile?.uid]);

  if (!isOpen || !profile) return null;

  const handleAddTakeaway = () => {
    const trimmed = takeawayInput.trim();
    if (!trimmed) return;
    playTapSound();
    setTakeaways((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      if (arr.includes(trimmed)) return arr;
      return [...arr, trimmed];
    });
    setTakeawayInput('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleRemoveTakeaway = (index: number) => {
    playTapSound();
    setTakeaways((prev) => (Array.isArray(prev) ? prev.filter((_, idx) => idx !== index) : []));
  };

  const handleSave = () => {
    playTapSound();
    onSave({
      status,
      notes,
      takeaways,
      locationOrTopic,
      scheduledDate: status === 'scheduled' ? scheduledDate : record?.scheduledDate,
      scheduledTime: status === 'scheduled' ? scheduledTime : record?.scheduledTime,
      completedAt: status === 'completed' ? (record?.completedAt || new Date().toISOString()) : undefined,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto p-3.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn flex flex-col items-center justify-start sm:justify-center"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl bg-[#171226] border-2 border-[#581C87] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[88dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#2E244A] via-[#1c1430] to-[#171226] border-b border-[#2E244A] flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#F59E0B] shrink-0">
              {profile.photoUrl && profile.photoUrl.trim() !== '' ? (
                <img src={profile.photoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#581C87] flex items-center justify-center font-bold text-white text-sm">
                  {profile.fullName.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                Coffee Chat: {profile.fullName}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {profile.preHbsRole} • {profile.preHbsCompany}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-left text-xs">
          
          {/* Status Selector */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
              Coffee Chat Status
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setStatus('request_sent')}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                  status === 'request_sent'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                    : 'bg-[#0B0813] border-[#2E244A] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Invite Pending</span>
                </div>
                <span className="text-[9px] text-slate-400 block font-normal">Awaiting reply</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('scheduled')}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                  status === 'scheduled'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-md'
                    : 'bg-[#0B0813] border-[#2E244A] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Scheduled</span>
                </div>
                <span className="text-[9px] text-slate-400 block font-normal">On calendar</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                  status === 'completed'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-[#0B0813] border-[#2E244A] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Completed</span>
                </div>
                <span className="text-[9px] text-slate-400 block font-normal">Had coffee!</span>
              </button>
            </div>
          </div>

          {/* If status is Scheduled, show Date & Time inputs and 1-Click Sync */}
          {status === 'scheduled' && (
            <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-300" />
                  <span>Scheduled Chat Time</span>
                </span>
                <AddToCalendarDropdown
                  event={{
                    title: `Coffee Chat with ${profile.fullName}`,
                    description: `HBS Section F Coffee Chat with ${profile.fullName} (${profile.preHbsRole} at ${profile.preHbsCompany}). ${notes ? `Notes: ${notes}` : ''}`,
                    location: locationOrTopic || 'Spangler Grille or Chao Center',
                    date: scheduledDate,
                    time: scheduledTime,
                  }}
                  variant="compact"
                  align="right"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-[#0B0813] text-white p-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-[#0B0813] text-white p-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Location / Meeting Spot or Topic */}
          <div>
            <label className="block text-slate-300 font-bold mb-1 text-[11px]">
              Location or Discussion Topic
            </label>
            <input
              type="text"
              value={locationOrTopic}
              onChange={(e) => setLocationOrTopic(e.target.value)}
              placeholder="e.g. Spangler Lounge, Chao Center, Zoom, VC & Fintech discussion"
              className="w-full bg-[#0B0813] text-white p-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none placeholder-slate-500 text-xs"
            />
          </div>

          {/* Key Takeaways & Highlights */}
          <div>
            <label className="block text-slate-300 font-bold mb-1 text-[11px]">
              Key Takeaways & Follow-ups
            </label>
            <div className="flex space-x-1.5 mb-2">
              <input
                ref={inputRef}
                type="text"
                value={takeawayInput}
                onChange={(e) => setTakeawayInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTakeaway();
                  }
                }}
                placeholder="e.g. Offered to introduce to ex-colleague at Google"
                className="flex-1 bg-[#0B0813] text-white p-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none placeholder-slate-500 text-xs"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddTakeaway();
                }}
                disabled={!takeawayInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#581C87] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-[#F59E0B] hover:text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </div>

            {takeaways.length > 0 && (
              <div className="space-y-1.5">
                {takeaways.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#0B0813] border border-[#2E244A]/80 text-slate-200 text-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTakeaway(idx)}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal Notes */}
          <div>
            <label className="block text-slate-300 font-bold mb-1 text-[11px] flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Notes</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key topics, shared interests, or follow-ups..."
              className="w-full bg-[#0B0813] text-white p-2.5 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none placeholder-slate-500 text-xs resize-none"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-[#0B0813] border-t border-[#2E244A] flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            {onDeleteRecord && record && (
              confirmDelete ? (
                <div className="flex items-center space-x-1.5 bg-rose-950/60 border border-rose-500/40 rounded-xl px-2 py-1">
                  <span className="text-[10px] text-rose-300 font-medium">Delete record?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteRecord();
                      onClose();
                    }}
                    className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-1.5 py-0.5 rounded-lg text-slate-300 hover:text-white text-[10px] cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                  title="Remove coffee chat record"
                  aria-label="Remove coffee chat record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}

            {onOpenInAppChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInAppChat(profile);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-[#2E244A] hover:bg-[#3E2968] text-purple-200 hover:text-white border border-purple-500/30 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                title={`Chat with ${profile.fullName}`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Chat</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-[#0B0813] font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

