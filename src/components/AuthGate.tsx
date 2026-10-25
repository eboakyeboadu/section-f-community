import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ShieldCheck,
  AlertCircle,
  Search,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { 
  loginWithGoogle, 
  checkEmailExists, 
  loginWithEmail, 
  registerWithEmail, 
  resetPassword,
  logoutUser,
  isAuthorizedEmailInFirestore
} from '../services/firebase';
import { 
  SECTION_F_ROSTER, 
  SectionFMember, 
  isValidSectionFEmail, 
  findSectionFMember, 
  saveLinkedGmail 
} from '../data/sectionFRoster';
import { SectionFWordmark } from './SectionFWordmark';
import { playTapSound, playPopSound, playChimeSound } from '../utils/soundEffects';
import { getHighResGooglePhotoUrl } from '../services/imageUtils';
import { registerUserPhotoStatus } from '../services/photoReminderService';
import { trackEvent } from '../services/analytics';

interface AuthGateProps {
  onAuthenticated: (user: { uid: string; email: string; displayName?: string; photoURL?: string }) => void;
  onDemoLogin: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

type AuthStep = 'email' | 'login_password' | 'signup_password' | 'link_gmail_classmate';

export const AuthGate: React.FC<AuthGateProps> = ({
  onAuthenticated,
  onDemoLogin,
  onOpenPrivacy,
  onOpenTerms,
}) => {
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [emailInput, setEmailInput] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  // Option A: Pending Gmail user awaiting classmate link
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  } | null>(null);
  const [searchClassmate, setSearchClassmate] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter Section F classmates for Option A linking
  const filteredClassmates = useMemo(() => {
    if (!searchClassmate.trim()) return SECTION_F_ROSTER;
    const q = searchClassmate.toLowerCase().trim();
    return SECTION_F_ROSTER.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.rawName.toLowerCase().includes(q) ||
        m.hbsEmail.toLowerCase().includes(q)
    );
  }, [searchClassmate]);

  // One-click Gmail Sign In & Sign Up
  const handleGoogleSignIn = async () => {
    playTapSound();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    trackEvent('login_started', { method: 'google' });
    try {
      const user = await loginWithGoogle();
      const userEmail = (user.email || '').trim().toLowerCase();

      const highResPhoto = getHighResGooglePhotoUrl(user.photoURL) || undefined;

      // Check if user's email is already recognized in Section F roster or linked
      if (isValidSectionFEmail(userEmail)) {
        const member = findSectionFMember(userEmail);
        playChimeSound();
        registerUserPhotoStatus(user.uid, userEmail, highResPhoto).catch(() => {});
        trackEvent('login_completed', { method: 'google', email: userEmail });
        onAuthenticated({
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || member?.displayName,
          photoURL: highResPhoto,
        });
      } else {
        // Option A: Classmate using a personal Gmail account -> Let them pick their Section F name
        playPopSound();
        setPendingGoogleUser({
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || undefined,
          photoURL: highResPhoto,
        });
        setSearchClassmate('');
        setAuthStep('link_gmail_classmate');
      }
    } catch (err: any) {
      console.error('Gmail Auth Error:', err);
      trackEvent('login_failed', { 
        method: 'google', 
        errorCode: err?.code || 'auth_failed', 
        message: err?.message 
      });
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup closed. Please try again.');
      } else {
        setError(err?.message || 'Gmail Sign-In was cancelled or unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Option A: Confirm linking personal Gmail to Section F classmate
  const handleSelectClassmateForGmail = (member: SectionFMember) => {
    if (!pendingGoogleUser) return;
    playPopSound();
    saveLinkedGmail(pendingGoogleUser.email, member.hbsEmail);
    playChimeSound();
    const highRes = getHighResGooglePhotoUrl(pendingGoogleUser.photoURL) || undefined;
    registerUserPhotoStatus(pendingGoogleUser.uid, pendingGoogleUser.email, highRes).catch(() => {});
    trackEvent('login_completed', { 
      method: 'google_linked', 
      email: pendingGoogleUser.email, 
      hbsEmail: member.hbsEmail 
    });
    onAuthenticated({
      uid: pendingGoogleUser.uid,
      email: pendingGoogleUser.email,
      displayName: member.displayName,
      photoURL: highRes,
    });
  };

  // Option A: Cancel and Sign out of personal Gmail
  const handleCancelLink = async () => {
    playTapSound();
    trackEvent('login_abandoned', { 
      reason: 'cancel_link_gmail', 
      email: pendingGoogleUser?.email 
    });
    setLoading(true);
    try {
      await logoutUser();
    } catch (e) {}
    setPendingGoogleUser(null);
    setAuthStep('email');
    setLoading(false);
  };

  // Step 1: Check if email already has an account or needs automatic creation
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    // Strictly enforce Section F membership on direct email entry (checking both in-app roster & Firestore)
    const localValid = isValidSectionFEmail(cleanEmail);
    let isAllowed = localValid;

    if (!localValid) {
      try {
        const firestoreValid = await isAuthorizedEmailInFirestore(cleanEmail);
        if (firestoreValid) {
          isAllowed = true;
        }
      } catch (err) {
        console.warn('Firestore email check error:', err);
      }
    }

    if (!isAllowed) {
      trackEvent('login_failed', { 
        method: 'email', 
        errorCode: 'invalid_section_f_email', 
        email: cleanEmail 
      });
      setError('Enter correct email address that belongs to Section F');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    trackEvent('login_started', { method: 'email', email: cleanEmail });

    const member = findSectionFMember(cleanEmail);

    try {
      const exists = await checkEmailExists(cleanEmail);
      playPopSound();

      if (exists) {
        // Account exists -> transition to password sign-in
        setAuthStep('login_password');
        setPassword('');
      } else {
        // Account does NOT exist -> transition to password sign-up automatically
        setAuthStep('signup_password');
        setPassword('');
        setConfirmPassword('');
        // Suggest real name from Section F roster
        if (member && !fullName) {
          setFullName(member.displayName);
        } else if (!fullName) {
          const handle = cleanEmail.split('@')[0];
          const inferred = handle
            .split(/[\._]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          setFullName(inferred);
        }
      }
    } catch (err: any) {
      console.error('Check email error:', err);
      // Fallback: Default to sign in with password
      setAuthStep('login_password');
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Sign In with Email & Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const user = await loginWithEmail(cleanEmail, password);
      playChimeSound();
      trackEvent('login_completed', { method: 'email_password', email: cleanEmail });
      onAuthenticated({
        uid: user.uid,
        email: user.email || cleanEmail,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err?.code || '';
      const msg = err?.message || '';
      trackEvent('login_failed', { 
        method: 'email_password', 
        errorCode: code || 'login_error', 
        message: msg, 
        email: cleanEmail 
      });
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect password. Please verify your credentials or reset your password.');
      } else if (code === 'auth/user-not-found') {
        // Automatically pivot to sign-up if user doesn't actually exist in auth
        setError(null);
        setAuthStep('signup_password');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please reset your password or try again later.');
      } else if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/admin-restricted-operation' ||
        msg.includes('OPERATION_NOT_ALLOWED') ||
        msg.includes('PASSWORD_LOGIN_DISABLED')
      ) {
        setError('Email/password login is currently unavailable. Please check your credentials or try again.');
      } else {
        setError(err?.message || 'Failed to sign in. Please check your password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Sign Up / Create Account with Email & Password
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const user = await registerWithEmail(cleanEmail, password, fullName.trim() || undefined);
      playChimeSound();
      registerUserPhotoStatus(user.uid, cleanEmail, undefined).catch(() => {});
      trackEvent('login_completed', { method: 'email_signup', email: cleanEmail });
      onAuthenticated({
        uid: user.uid,
        email: user.email || cleanEmail,
        displayName: user.displayName || fullName.trim() || undefined,
        photoURL: user.photoURL || undefined,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      const code = err?.code || '';
      const msg = err?.message || '';
      trackEvent('login_failed', { 
        method: 'email_signup', 
        errorCode: code || 'signup_error', 
        message: msg, 
        email: cleanEmail 
      });
      if (code === 'auth/email-already-in-use') {
        // User already exists -> pivot to sign in
        setError('An account already exists for this email. Please enter your password to sign in.');
        setAuthStep('login_password');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/admin-restricted-operation' ||
        msg.includes('OPERATION_NOT_ALLOWED') ||
        msg.includes('PASSWORD_LOGIN_DISABLED')
      ) {
        setError('Custom password creation is disabled in Firebase. Please tap "Continue with Google" to authenticate directly!');
      } else {
        setError(err?.message || 'Could not create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Self-service password reset
  const handleForgotPassword = async () => {
    playTapSound();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email to receive a password reset link.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(cleanEmail);
      playPopSound();
      setSuccessMessage(`Password reset link sent to ${cleanEmail}. Check your inbox!`);
    } catch (err: any) {
      setError(err?.message || 'Could not send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Back to Email Step
  const handleBackToEmail = () => {
    playTapSound();
    setAuthStep('email');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0813] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-[#F59E0B] selection:text-black">
      
      {/* Ambient Glow Orbs */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#581C87]/30 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-[#F59E0B]/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-20 left-10 w-72 h-72 rounded-full bg-[#581C87]/20 blur-3xl pointer-events-none -z-10" />

      {/* Main Luxury Obsidian Dossier Card */}
      <div 
        className="w-full max-w-sm mx-auto bg-[#171226]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] relative flex flex-col items-center text-center border border-[#2E244A]/80"
      >
        
        {/* Section F wordmark */}
        <div className="mb-3.5 flex items-center justify-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <SectionFWordmark className="w-14 h-18" />
        </div>

        {/* Editorial Hierarchy & Institution Titles */}
        <div className="space-y-1 mb-4">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-white block">
            AN INDEPENDENT SECTION COMMUNITY
          </span>
          <h1 className="text-3xl sm:text-[32px] font-normal text-white tracking-tight uppercase font-['EB_Garamond',serif]">
            SECTION F COMMUNITY HUB
          </h1>
          <p className="text-[10px] text-slate-400 tracking-wider uppercase whitespace-nowrap">
            CLASS OF 2028 DIRECTORY
          </p>
        </div>

        {/* Alerts: Error & Success */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="w-full mb-3.5 p-3 bg-rose-950/90 border border-rose-700/70 rounded-2xl text-rose-200 text-xs flex flex-col gap-2 shadow-lg text-left"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug font-medium flex-1">{error}</span>
              </div>
              {(error.includes('Google') || error.includes('Harvard SSO')) && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 shadow transition-all cursor-pointer mt-1"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M12 5c1.55 0 2.94.55 4.04 1.45l3.02-3.02C17.24 1.74 14.8 1 12 1 7.37 1 3.4 3.65 1.5 7.5l3.66 2.84C6.04 7.35 8.78 5 12 5z" fill="#EA4335" />
                    <path d="M23.5 12.28c0-.79-.07-1.54-.19-2.28H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-1.99 3.73-4.94 3.73-8.68z" fill="#4285F4" />
                    <path d="M5.16 14.66c-.23-.68-.36-1.41-.36-2.16s.13-1.48.36-2.16L1.5 7.5C.54 9.4 0 11.53 0 13.5s.54 4.1 1.5 6l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.87c-1.04.7-2.38 1.13-4.23 1.13-3.22 0-5.96-2.35-6.84-5.34L1.5 15.85C3.4 19.7 7.37 23 12 23z" fill="#34A853" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="w-full mb-3.5 p-3 bg-emerald-950/80 border border-emerald-600/60 rounded-2xl text-emerald-200 text-xs text-left flex items-start gap-2 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Container with AnimatePresence */}
        <div className="w-full flex flex-col gap-2.5">

          {/* STEP 1: Email Entry & Google Sign-In */}
          {authStep === 'email' && (
            <div
              className="w-full flex flex-col gap-2.5"
            >
              {/* Option A: One-Click Google / HBS Sign In */}
              <button
                id="sso-gmail-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-[#211e2a] hover:bg-[#2c2834] text-white flex items-center justify-center gap-3 text-xs font-semibold shadow-md transition-all duration-200 active:scale-[0.98] border border-[#373340]/50 cursor-pointer disabled:opacity-60 group"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M12 5c1.55 0 2.94.55 4.04 1.45l3.02-3.02C17.24 1.74 14.8 1 12 1 7.37 1 3.4 3.65 1.5 7.5l3.66 2.84C6.04 7.35 8.78 5 12 5z"
                    fill="#EA4335"
                  />
                  <path
                    d="M23.5 12.28c0-.79-.07-1.54-.19-2.28H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-1.99 3.73-4.94 3.73-8.68z"
                    fill="#4285F4"
                  />
                  <path
                    d="M5.16 14.66c-.23-.68-.36-1.41-.36-2.16s.13-1.48.36-2.16L1.5 7.5C.54 9.4 0 11.53 0 13.5s.54 4.1 1.5 6l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.87c-1.04.7-2.38 1.13-4.23 1.13-3.22 0-5.96-2.35-6.84-5.34L1.5 15.85C3.4 19.7 7.37 23 12 23z"
                    fill="#34A853"
                  />
                </svg>
                <span className="tracking-wide text-xs font-semibold leading-tight text-white group-hover:text-amber-300 transition-colors">
                  Continue with Google
                </span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="w-full border-t border-[#2E244A]" />
                <span className="absolute px-3 bg-[#171226] text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                  or continue with email
                </span>
              </div>

              {/* Email Form */}
              <form onSubmit={handleCheckEmail} className="w-full flex flex-col gap-2.5">
                <div className="relative w-full">
                  <input
                    id="email-input"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@mba2028.hbs.edu"
                    autoComplete="email"
                    required
                    className="w-full bg-[#211e2a] rounded-full px-5 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/70 shadow-inner border border-[#373340]/40 transition-all text-center"
                  />
                </div>

                <button
                  id="email-continue-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#581c87] to-[#7e22ce] hover:from-[#6b21a8] hover:to-[#9333ea] text-white flex items-center justify-center gap-2 text-xs font-semibold shadow-xl shadow-[#581c87]/30 transition-all duration-200 active:scale-[0.98] group cursor-pointer disabled:opacity-60"
                >
                  <span className="tracking-wide">
                    {loading ? 'Checking Account...' : 'Continue with Email'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-300 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2A: Existing User -> Enter Password to Sign In */}
          {authStep === 'login_password' && (
            <div
              className="w-full flex flex-col gap-3 text-left"
            >
              {/* Account Found Header & Back link */}
              <div className="bg-[#211e2a]/70 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    Welcome Back · Sign In
                  </span>
                  <p className="text-xs text-white font-medium truncate">
                    {emailInput}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-[11px] text-slate-400 hover:text-amber-300 underline underline-offset-2 flex-shrink-0 cursor-pointer p-1"
                >
                  Change
                </button>
              </div>

              {/* Password Form */}
              <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-2.5">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    autoFocus
                    required
                    className="w-full bg-[#211e2a] rounded-full pl-10 pr-10 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner border border-[#373340]/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setShowPassword(!showPassword);
                    }}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-end px-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-[11px] text-amber-400/90 hover:text-amber-300 transition-colors font-medium cursor-pointer bg-transparent border-0"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  id="email-signin-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#581c87] to-[#7e22ce] hover:from-[#6b21a8] hover:to-[#9333ea] text-white flex items-center justify-center gap-2 text-xs font-semibold shadow-xl shadow-[#581c87]/30 transition-all duration-200 active:scale-[0.98] group cursor-pointer disabled:opacity-60 mt-1"
                >
                  <span className="tracking-wide">
                    {loading ? 'Verifying Password...' : 'Sign In with Password'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-300 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </form>

              {/* Switch to Create Account if desired */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setAuthStep('signup_password');
                    setError(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Need to create a new account instead? <span className="text-amber-400 font-semibold">Sign up</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: New User -> Automatically Prompt to Create Account with Password */}
          {authStep === 'signup_password' && (
            <div
              className="w-full flex flex-col gap-3 text-left"
            >
              {/* Account Not Found Banner & Switcher */}
              <div className="bg-[#261633] p-3 rounded-2xl border border-purple-500/30 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5 text-[#F59E0B]">
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      Create Your Account
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium truncate mt-0.5">
                    {emailInput}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-[11px] text-slate-400 hover:text-amber-300 underline underline-offset-2 flex-shrink-0 cursor-pointer p-1"
                >
                  Change
                </button>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSignUpSubmit} className="w-full flex flex-col gap-2.5">
                
                {/* Full Name Field */}
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1 px-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Laurie Lki"
                    autoComplete="name"
                    required
                    className="w-full bg-[#211e2a] rounded-full px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner border border-[#373340]/40 transition-all"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1 px-1">
                    Create Password <span className="text-slate-500 text-[10px]">(min. 6 characters)</span>
                  </label>
                  <div className="relative w-full">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      autoFocus
                      required
                      className="w-full bg-[#211e2a] rounded-full pl-4 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner border border-[#373340]/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setShowPassword(!showPassword);
                      }}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1 px-1">
                    Confirm Password
                  </label>
                  <div className="relative w-full">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      required
                      className="w-full bg-[#211e2a] rounded-full pl-4 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner border border-[#373340]/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setShowConfirmPassword(!showConfirmPassword);
                      }}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="email-signup-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#581c87] to-[#7e22ce] hover:from-[#6b21a8] hover:to-[#9333ea] text-white flex items-center justify-center gap-2 text-xs font-semibold shadow-xl shadow-[#581c87]/30 transition-all duration-200 active:scale-[0.98] group cursor-pointer disabled:opacity-60 mt-1"
                >
                  <span className="tracking-wide">
                    {loading ? 'Creating Account...' : 'Create Account & Sign Up'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-300 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </form>

              {/* Switch back to Sign In */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setAuthStep('login_password');
                    setError(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Already registered? <span className="text-amber-400 font-semibold">Sign in with password</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2C (Option A): Classmate Signed in with personal Gmail -> Link to Section F Roster */}
          {authStep === 'link_gmail_classmate' && (
            <div className="w-full flex flex-col gap-3 text-left">
              {/* Account Banner */}
              <div className="bg-[#261633] p-3.5 rounded-2xl border border-purple-500/30">
                <div className="flex items-center space-x-1.5 text-[#F59E0B]">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    Section F Verification
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white mt-1">
                  Connect Your Section F Profile
                </h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Signed in with <span className="text-amber-400 font-semibold">{pendingGoogleUser?.email}</span>. Select your name from the Section F roster below to link your account:
                </p>
              </div>

              {/* Classmate Search input */}
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchClassmate}
                  onChange={(e) => setSearchClassmate(e.target.value)}
                  placeholder="Search your name (e.g. Natasha, Court)..."
                  className="w-full bg-[#211e2a] rounded-full pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner border border-[#373340]/40 transition-all"
                  autoFocus
                />
              </div>

              {/* Scrollable Roster list */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {filteredClassmates.map((member) => (
                  <button
                    key={member.hbsEmail}
                    type="button"
                    onClick={() => handleSelectClassmateForGmail(member)}
                    className="w-full text-left p-2.5 rounded-xl bg-[#211e2a]/80 hover:bg-purple-900/40 border border-[#373340]/40 hover:border-amber-400/50 flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-semibold text-white group-hover:text-amber-300 block truncate">
                        {member.displayName}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {member.hbsEmail}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400/90 group-hover:text-amber-300 flex-shrink-0">
                      <span>Select</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
                {filteredClassmates.length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-400 bg-[#211e2a]/30 rounded-xl border border-white/5">
                    No matching Section F classmate found.
                  </div>
                )}
              </div>

              {/* Cancel & Sign Out Option */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleCancelLink}
                  disabled={loading}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Not in Section F? <span className="underline">Sign out & use another email</span>
                </button>
              </div>
            </div>
          )}

          {/* Guest Access Option */}
          <div className="w-full pt-2">
            <button
              id="guest-access-btn"
              type="button"
              onClick={() => {
                playTapSound();
                trackEvent('guest_mode_entered');
                onDemoLogin();
              }}
              className="w-full py-3 px-4 rounded-full bg-[#211e2a]/60 hover:bg-[#211e2a] text-slate-300 hover:text-white flex items-center justify-center gap-2 text-xs border border-[#373340]/40 transition-all duration-200 active:scale-[0.98] group cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="font-medium tracking-wide">Try Section F Guest Access</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

        </div>

      </div>

      {/* Ambient Bottom Legal Links */}
      <div className="text-center pt-4 pb-2">
        {(onOpenPrivacy || onOpenTerms) && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <span>&copy; 2026 Section F</span>
            <span>&bull;</span>
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="hover:text-amber-400 text-slate-400 transition-colors underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
              >
                Privacy Policy
              </button>
            )}
            {onOpenPrivacy && onOpenTerms && <span>&bull;</span>}
            {onOpenTerms && (
              <button
                type="button"
                onClick={onOpenTerms}
                className="hover:text-amber-400 text-slate-400 transition-colors underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
              >
                Terms of Service
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

