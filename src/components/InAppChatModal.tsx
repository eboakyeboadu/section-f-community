import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  Edit3,
  Check, 
  CheckCheck, 
  MessageSquare, 
  Sparkles,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Profile, ChatMessage, CoffeeChatRecord } from '../types';
import { 
  getConversationId, 
  sendChatMessage, 
  subscribeToConversationMessages, 
  markChatMessagesAsRead,
  deleteChatMessageForEveryone,
  deleteChatMessageForMe
} from '../services/firebase';
import { playTapSound, playChimeSound, playPopSound } from '../utils/soundEffects';

interface InAppChatModalProps {
  isOpen: boolean;
  recipient: Profile | null;
  currentUserProfile: Profile | null;
  coffeeChatRecord?: CoffeeChatRecord;
  onClose: () => void;
  onOpenCoffeeChatModal?: (recipient: Profile) => void;
}

const QUICK_PROMPTS = [
  "Thanks for the great coffee chat.",
  "Let's grab lunch at Spangler.",
  "Great seeing you in class today.",
];

export const InAppChatModal: React.FC<InAppChatModalProps> = ({
  isOpen,
  recipient,
  currentUserProfile,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageToManage, setMessageToManage] = useState<ChatMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const senderUid = currentUserProfile?.uid;
  const recipientUid = recipient?.uid;
  const conversationId = senderUid && recipientUid ? getConversationId(senderUid, recipientUid) : null;

  // Real-time listener for conversation messages
  useEffect(() => {
    if (!isOpen || !conversationId || !senderUid) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToConversationMessages(conversationId, (newMessages) => {
      setMessages((prev) => {
        const map = new Map<string, ChatMessage>();
        prev.forEach((m) => {
          if (!m.deletedForUids || !m.deletedForUids.includes(senderUid)) {
            map.set(m.id, m);
          }
        });
        newMessages.forEach((m) => {
          if (!m.deletedForUids || !m.deletedForUids.includes(senderUid)) {
            map.set(m.id, m);
          }
        });
        return Array.from(map.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      // Identify unread messages sent to the current user and mark them read
      const unreadIds = newMessages
        .filter((m) => m.recipientUid === senderUid && !m.read && (!m.deletedForUids || !m.deletedForUids.includes(senderUid)))
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        markChatMessagesAsRead(unreadIds).catch((err) => {
          console.warn('Failed to mark chat messages as read:', err);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, conversationId, senderUid]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Lock background body scroll while chat modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !recipient || !currentUserProfile) return null;

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter key strictly inserts newline; sending is ONLY triggered with the Send button
    if (e.key === 'Enter') {
      e.stopPropagation();
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !senderUid || !recipientUid || isSending) return;

    setIsSending(true);
    playTapSound();

    try {
      const sentMessage = await sendChatMessage({
        senderUid,
        senderName: currentUserProfile.nickname || currentUserProfile.fullName,
        senderPhoto: currentUserProfile.photoUrl || undefined,
        recipientUid,
        recipientName: recipient.nickname || recipient.fullName,
        message: textToSend,
      });

      // Immediately append message to active chat window
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMessage.id)) return prev;
        return [...prev, sentMessage];
      });

      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      playChimeSound();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!messageToManage) return;
    const targetId = messageToManage.id;
    setIsDeletingMessage(true);
    playPopSound();

    // Optimistically remove from state immediately
    setMessages((prev) => prev.filter((m) => m.id !== targetId));
    setMessageToManage(null);

    try {
      await deleteChatMessageForEveryone(targetId);
    } catch (err) {
      console.error('Failed to delete message for everyone:', err);
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handleDeleteForMe = async () => {
    if (!messageToManage || !senderUid) return;
    const targetId = messageToManage.id;
    setIsDeletingMessage(true);
    playPopSound();

    // Optimistically remove from state immediately
    setMessages((prev) => prev.filter((m) => m.id !== targetId));
    setMessageToManage(null);

    try {
      await deleteChatMessageForMe(targetId, senderUid);
    } catch (err) {
      console.error('Failed to delete message for me:', err);
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return timeStr;
      
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return '';
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="relative w-full max-w-lg bg-[#140E26] border-0 sm:border border-[#2E244A] rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-[90dvh] sm:max-h-[720px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 sm:py-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-r from-[#1c1236] via-[#140E26] to-[#1c1236] border-b border-[#2E244A] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-[#F59E0B]/60 bg-[#2E244A] shrink-0">
                {recipient.photoUrl ? (
                  <img src={recipient.photoUrl} alt={recipient.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#581C87] flex items-center justify-center font-bold text-white text-sm">
                    {recipient.fullName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-bold text-white truncate">
                    {recipient.fullName}
                  </h3>
                  {recipient.countryCode && (
                    <span className="text-xs">
                      {recipient.countryCode.toUpperCase().replace(/./g, (c) =>
                        String.fromCodePoint(c.charCodeAt(0) + 127397)
                      )}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {recipient.preHbsRole} • {recipient.preHbsCompany}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  playTapSound();
                  onClose();
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#2E244A]/60 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] shadow-inner">
                  <MessageSquare className="w-7 h-7 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Start a conversation with {recipient.nickname || recipient.fullName.split(' ')[0]}
                  </h4>
                </div>

                {/* Quick Prompts Container */}
                <div className="w-full max-w-sm pt-2 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 text-left">
                    Icebreakers:
                  </span>
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        playTapSound();
                        setInputText(prompt);
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.style.height = 'auto';
                            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
                            textareaRef.current.focus();
                          }
                        }, 50);
                      }}
                      className="text-left text-xs px-3.5 py-2.5 rounded-xl bg-[#1C1433] hover:bg-[#2E244A] border border-white/5 hover:border-[#F59E0B]/30 text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                      title="Use this icebreaker"
                    >
                      <span>{prompt}</span>
                      <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#F59E0B] transition-colors shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderUid === senderUid;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-[78%] ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                      {/* Subtle Message Action Trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTapSound();
                          setMessageToManage(msg);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-opacity cursor-pointer shrink-0"
                        title="Message options"
                        aria-label="Message options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-md leading-relaxed break-words ${
                          isMe
                            ? 'bg-gradient-to-r from-[#6B21A8] to-[#7E22CE] text-white rounded-br-xs border border-[#A855F7]/30'
                            : 'bg-[#1E1738] text-slate-100 rounded-bl-xs border border-[#3E2968]/60'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 mt-1 px-1 text-[10px] text-slate-400">
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      {isMe && (
                        <span title={msg.read ? "Read" : "Sent"}>
                          {msg.read ? (
                            <CheckCheck className="w-3 h-3 text-[#F59E0B]" />
                          ) : (
                            <Check className="w-3 h-3 text-slate-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar (when messages exist) */}
          {messages.length > 0 && (
            <div className="px-3 py-1.5 bg-[#0F0A1F] border-t border-[#2E244A] overflow-x-auto no-scrollbar flex items-center space-x-1.5 shrink-0">
              <span className="text-[10px] text-slate-500 font-bold shrink-0 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#F59E0B]" />
              </span>
              {QUICK_PROMPTS.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    playTapSound();
                    setInputText(prompt);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
                        textareaRef.current.focus();
                      }
                    }, 50);
                  }}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-[#1C1433] hover:bg-[#2E244A] text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#17102D] border-t border-[#2E244A] flex items-end space-x-2 shrink-0">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${recipient.nickname || recipient.fullName.split(' ')[0]}...`}
              disabled={isSending}
              className="flex-1 bg-[#0B0716] border border-[#2E244A] focus:border-[#F59E0B] rounded-2xl px-3.5 py-2.5 text-sm sm:text-xs text-white placeholder-slate-500 focus:outline-none transition-colors resize-none max-h-[120px] min-h-[44px] leading-relaxed"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending}
              className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#FBBF24] hover:to-[#F59E0B] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] mb-0.5"
              aria-label="Send message"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Message Action Sheet / Delete Options Modal */}
          {messageToManage && (
            <div 
              className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
              onClick={() => setMessageToManage(null)}
            >
              <div 
                className="w-full max-w-sm bg-[#1A1230] border border-[#3E2968] rounded-3xl p-4 shadow-2xl flex flex-col gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <h4 className="text-sm font-bold text-white">Delete Message</h4>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setMessageToManage(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 line-clamp-3 italic bg-[#0F0A1F] p-3 rounded-2xl border border-white/5">
                  "{messageToManage.message}"
                </p>

                <div className="flex flex-col gap-2 pt-1">
                  {messageToManage.senderUid === senderUid && (
                    <button
                      type="button"
                      onClick={handleDeleteForEveryone}
                      disabled={isDeletingMessage}
                      className="w-full py-3 px-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-red-900/30 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete for everyone</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDeleteForMe}
                    disabled={isDeletingMessage}
                    className="w-full py-3 px-3 rounded-2xl bg-[#2A1F45] hover:bg-[#382B5C] text-slate-100 hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    <span>Delete for me</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMessageToManage(null)}
                    disabled={isDeletingMessage}
                    className="w-full py-2 text-slate-400 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

