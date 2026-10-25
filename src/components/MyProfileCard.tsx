import React, { useState } from 'react';
import { 
  User, 
  Edit3, 
  Share2, 
  Download, 
  LogOut, 
  UserCheck, 
  ShieldCheck, 
  Lock,
  ArrowRight,
  Coffee,
  MessageCircle,
  Home,
  CheckCircle2,
  LogIn,
  Bookmark,
  Trash2,
  AlertTriangle,
  Database,
  Bell,
  BellRing,
  Check,
  Loader2
} from 'lucide-react';
import { Profile } from '../types';
import { ClassmateCard } from './ClassmateCard';
import { motion } from 'motion/react';
import { playTapSound } from '../utils/soundEffects';
import { 
  isPushNotificationsEnabled,
  enablePushNotifications,
  disablePushNotifications
} from '../services/pushNotificationService';

interface MyProfileCardProps {
  profile: Profile | null;
  savedProfiles?: Profile[];
  isGuest?: boolean;
  isAdmin?: boolean;
  onEditProfile: () => void;
  onSignOut: () => void;
  onOpenDetails: (profile: Profile) => void;
  onSignInRequested?: () => void;
  onGuestActionPrompt?: (actionName: string) => void;
  onDeleteProfile?: () => Promise<void> | void;
  onOpenAdminSeed?: () => void;
}

export const MyProfileCard: React.FC<MyProfileCardProps> = ({
  profile,
  savedProfiles = [],
  isGuest = false,
  isAdmin = false,
  onEditProfile,
  onSignOut,
  onOpenDetails,
  onSignInRequested,
  onGuestActionPrompt,
  onDeleteProfile,
  onOpenAdminSeed,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => isPushNotificationsEnabled());
  const [isTogglingPush, setIsTogglingPush] = useState<boolean>(false);
  const [pushNotice, setPushNotice] = useState<string>('');

  const handleToggleNotifications = async () => {
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('Push Notifications');
      return;
    }
    playTapSound();
    setIsTogglingPush(true);
    setPushNotice('');

    try {
      if (isPushEnabled) {
        // Toggle OFF: disable notifications and update Firestore
        await disablePushNotifications(profile?.uid);
        setIsPushEnabled(false);
      } else {
        // Toggle ON: request browser permission and sync to Firestore
        const res = await enablePushNotifications(profile?.uid);
        if (res.granted) {
          setIsPushEnabled(true);
        } else {
          setIsPushEnabled(false);
          if (res.error) {
            setPushNotice(res.error);
            setTimeout(() => setPushNotice(''), 5000);
          }
        }
      }
    } catch {
      setIsPushEnabled(isPushNotificationsEnabled());
    } finally {
      setIsTogglingPush(false);
    }
  };

  if (!profile) return null;

  // Generate downloadable vCard (.vcf) with Instagram & LinkedIn
  const downloadVCard = () => {
    if (isGuest) {
      if (onGuestActionPrompt) onGuestActionPrompt('Contact vCard Export');
      return;
    }

    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${profile.fullName}`,
      `N:${profile.fullName.split(' ').slice(1).join(' ')};${profile.fullName.split(' ')[0]};;;`,
      `ORG:Section F 2028`,
      `TITLE:${profile.preHbsRole} (${profile.preHbsCompany})`,
      `EMAIL;TYPE=INTERNET,WORK:${profile.email}`,
      profile.phone ? `TEL;TYPE=CELL,VOICE,MSG:${profile.phone}` : (profile.whatsapp ? `TEL;TYPE=CELL,VOICE,MSG:${profile.whatsapp}` : ''),
      profile.whatsapp && profile.phone && profile.whatsapp.trim() !== profile.phone.trim() ? `TEL;TYPE=WORK,MSG:${profile.whatsapp}` : '',
      profile.instagramHandle ? `X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/${profile.instagramHandle.replace('@', '')}` : '',
      profile.linkedinUrl ? `URL;TYPE=WORK:${profile.linkedinUrl}` : '',
      `NOTE:Section F '28 | Housing: ${profile.housingDetail} | Fun Fact: ${profile.funFact}`,
      profile.companyUrl ? `URL:${profile.companyUrl}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${profile.fullName.replace(/\s+/g, '_')}_SectionF.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareCard = async () => {
    playTapSound();
    const appUrl = 'https://sectionf28.ai.studio';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${profile.fullName} · Section F Community Hub`,
          text: `Connect with ${profile.fullName} on the Section F Class of 2028 Community Hub!`,
          url: appUrl,
        });
        return;
      } catch (e) {
        // User aborted native share
      }
    }
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch (e) {}
  };

  // If in Guest Mode, render an organized, dedicated Guest Hub view
  if (isGuest) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-1 text-slate-100 px-1 animate-fadeIn">
        
        {/* Editorial Guest Welcome Banner */}
        <div className="bg-gradient-to-br from-[#581C87] via-[#2E244A] to-[#171226] p-5 rounded-3xl border border-[#F59E0B]/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F59E0B] bg-[#0B0813]/60 px-2 py-0.5 rounded-full border border-[#F59E0B]/30 flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>Section F '28 Guest Mode</span>
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-white tracking-tight mb-1">
            Build Your Directory Profile
          </h2>
          <p className="text-xs text-purple-200 leading-relaxed mb-4">
            Sign in to have full access, create your official directory profile, and connect with your section.
          </p>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playTapSound();
              if (onSignInRequested) onSignInRequested();
              else onSignOut();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-xl transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Have Full Access</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Member Benefits Card */}
        <div className="bg-[#171226] p-3.5 rounded-3xl border border-[#2E244A] shadow-xl space-y-2.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
            <span>Verified Section F Features</span>
          </h3>

          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span className="truncate">
                <strong className="text-white">Socials & Contacts:</strong> Instagram, LinkedIn & WhatsApp
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span className="truncate">
                <strong className="text-white">Family Connections:</strong> Partner, spouse & section family
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span className="truncate">
                <strong className="text-white">Coffee Chats:</strong> Meetups, connections & notes
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span className="truncate">
                <strong className="text-white">Directory Profile:</strong> Photos, fun facts & career targets
              </span>
            </div>
          </div>
        </div>

        {/* Sample Preview Card Accordion */}
        <div className="bg-[#171226] p-4 rounded-3xl border border-[#2E244A] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-[#F59E0B]" />
              <h3 className="text-xs font-bold text-white">Directory Profile Preview</h3>
            </div>
            <span className="text-[10px] text-slate-400">Preview</span>
          </div>

          <div className="h-[460px] w-full rounded-2xl overflow-hidden shadow-lg border border-[#2E244A]">
            <ClassmateCard
              profile={profile}
              isGuest={true}
              onCoffeeChat={() => {
                if (onGuestActionPrompt) onGuestActionPrompt('Coffee Chats');
              }}
              onOpenDetails={onOpenDetails}
              onGuestActionPrompt={onGuestActionPrompt}
            />
          </div>
        </div>

        {/* Exit Guest Mode */}
        <div className="text-center pt-2">
          <button
            onClick={onSignOut}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center space-x-1.5 py-2 px-4 rounded-xl hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Guest Mode</span>
          </button>
        </div>

      </div>
    );
  }

  // Verified Member View
  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-1 text-slate-100 px-1">
      
      {/* Top Banner with Edit & Actions - Sleek 1-Row */}
      <div className="bg-[#171226] p-3.5 rounded-3xl border border-[#2E244A] shadow-xl flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative shrink-0">
            {profile.photoUrl && profile.photoUrl.trim() !== '' ? (
              <img
                src={profile.photoUrl}
                alt={profile.fullName}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-[#F59E0B]"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-[#2E244A]/60 flex items-center justify-center border-2 border-[#F59E0B] shadow">
                <User className="w-5 h-5 text-slate-300" />
              </div>
            )}
            {profile.isCurrentUser && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#171226] rounded-full" title="Active Account" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 truncate">
              <h2 className="text-sm font-bold text-white tracking-tight truncate">{profile.fullName}</h2>
              {isAdmin ? (
                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                  Admin (Hidden)
                </span>
              ) : (
                <span className="text-[9px] font-bold text-[#F59E0B] bg-[#581C87] px-1.5 py-0.2 rounded shrink-0">
                  Live
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">{profile.email}</p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playTapSound();
            onEditProfile();
          }}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white font-bold text-xs flex items-center space-x-1.5 border border-amber-400/40 shadow-lg cursor-pointer shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span>Edit</span>
        </motion.button>
      </div>

      {/* Admin Testing Mode Privacy Notice */}
      {isAdmin && (
        <div className="bg-amber-950/30 border border-amber-500/25 rounded-2xl p-2.5 text-xs text-amber-200/90 flex items-center space-x-2.5 shadow-sm">
          <span className="text-base select-none shrink-0">🛡️</span>
          <p className="text-[11px] leading-snug text-amber-200/90">
            <strong className="text-amber-300 font-semibold">Testing Account Active:</strong> Your admin profile is completely hidden from other classmates in the card deck, spotlight, calendar, and search.
          </p>
        </div>
      )}



      {/* Live Card View */}
      <div className="h-[480px] w-full rounded-3xl overflow-hidden shadow-2xl">
        <ClassmateCard
          profile={{ ...profile, isCurrentUser: true }}
          isGuest={false}
          onCoffeeChat={() => {}}
          onOpenDetails={onOpenDetails}
        />
      </div>

      {/* Quick Utilities & Export Action Bar */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={downloadVCard}
          className="py-3 px-3 rounded-2xl bg-[#171226] hover:bg-[#201836] border border-[#2E244A] text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all cursor-pointer min-h-[46px]"
        >
          <Download className="w-4 h-4 text-[#F59E0B]" />
          <span>Save Contact (.vcf)</span>
        </button>

        <button
          onClick={shareCard}
          className="py-3 px-3 rounded-2xl bg-[#171226] hover:bg-[#201836] border border-[#2E244A] text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all cursor-pointer min-h-[46px]"
        >
          {copiedLink ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 font-bold">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-[#F59E0B]" />
              <span>Share Profile</span>
            </>
          )}
        </button>
      </div>

      {/* Bookmarked / Saved Classmates Shelf */}
      {savedProfiles.length > 0 && (
        <div className="bg-[#171226] p-4 rounded-3xl border border-[#2E244A] space-y-3 shadow-xl">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
            <h3 className="text-xs font-bold text-white">Saved Classmates ({savedProfiles.length})</h3>
          </div>

          <div className="flex space-x-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {savedProfiles.map((p) => (
              <div
                key={p.uid}
                onClick={() => onOpenDetails(p)}
                className="flex-shrink-0 flex items-center space-x-2 p-2 rounded-xl bg-[#0B0813] border border-[#2E244A] hover:border-[#F59E0B] cursor-pointer transition-all active:scale-95"
              >
                {p.photoUrl && p.photoUrl.trim() !== '' ? (
                  <img
                    src={p.photoUrl}
                    alt={p.fullName}
                    className="w-8 h-8 rounded-lg object-cover border border-[#F59E0B]/40 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#2E244A]/60 flex items-center justify-center border border-[#F59E0B]/40 shrink-0">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
                <div className="text-left min-w-0 pr-1">
                  <span className="text-xs font-bold text-white block truncate max-w-[100px] leading-tight">
                    {p.fullName}
                  </span>
                  <span className="text-[10px] text-[#F59E0B] block truncate max-w-[100px]">
                    {p.preHbsCompany}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enable push notification - Single Row */}
      <div className="bg-[#171226] px-4 py-3 rounded-2xl border border-[#2E244A] shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-white">Enable push notification</span>
          <button
            type="button"
            role="switch"
            aria-checked={isPushEnabled}
            onClick={handleToggleNotifications}
            disabled={isTogglingPush}
            title={isPushEnabled ? 'Toggle to disable push notifications' : 'Toggle to enable push notifications'}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPushEnabled ? 'bg-amber-500' : 'bg-[#2E244A]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isPushEnabled ? 'translate-x-5' : 'translate-x-0'
              } flex items-center justify-center`}
            >
              {isTogglingPush && <Loader2 className="w-3 h-3 text-slate-900 animate-spin" />}
            </span>
          </button>
        </div>
        {pushNotice && (
          <p className="text-[11px] text-amber-300 mt-2 pt-2 border-t border-[#2E244A]/60 leading-tight">
            {pushNotice}
          </p>
        )}
      </div>

      {/* Account Settings */}
      <div className="bg-[#171226] p-3.5 rounded-3xl border border-[#2E244A] space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <h3 className="text-xs font-bold text-white truncate">Account & Session</h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Verified
          </span>
        </div>

        <div className="pt-2 border-t border-[#2E244A] flex items-center justify-between gap-2">
          {onDeleteProfile && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1.5 py-1.5 px-2.5 rounded-xl hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-all cursor-pointer"
              title="Delete your profile from the section directory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Profile</span>
            </button>
          )}

          <button
            onClick={onSignOut}
            className="text-xs text-slate-300 hover:text-white font-semibold flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-[#0B0813] hover:bg-[#201836] border border-[#2E244A] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Administrator Tools - Only rendered for authorized admin */}
      {isAdmin && onOpenAdminSeed && (
        <div className="bg-[#171226] p-3.5 rounded-3xl border border-amber-500/30 space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Database className="w-4 h-4 text-amber-400 shrink-0" />
              <h3 className="text-xs font-bold text-white truncate">Administrator Tools</h3>
            </div>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 shrink-0">
              Admin Only
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Manage Section F Firestore database collections, authorized roster emails, and card seeding tools.
          </p>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              onOpenAdminSeed();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 to-purple-600/30 hover:from-amber-600/50 hover:to-purple-600/50 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Firestore Management</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#171226] border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">Delete Profile from Database?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will permanently delete your Section F card, photos, and information from the database. Other classmates will no longer see your card.
              </p>
            </div>

            <div className="p-3 bg-[#0B0813] rounded-xl border border-[#2E244A] text-[11px] text-slate-400">
              💡 You can always create a fresh card anytime by signing back in.
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B0813] hover:bg-[#201836] text-slate-300 font-semibold text-xs border border-[#2E244A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDeleteProfile) {
                    setIsDeleting(true);
                    try {
                      await onDeleteProfile();
                      setShowDeleteConfirm(false);
                    } catch (e) {
                      console.error('Delete error:', e);
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg border border-rose-400/30 cursor-pointer active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

