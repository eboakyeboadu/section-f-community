import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Shield, FileText, CheckCircle2, ArrowUp } from 'lucide-react';

export type LegalTab = 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  activeTab: LegalTab;
  onTabChange: (tab: LegalTab) => void;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll to top when active tab changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div 
        className="w-full sm:max-w-3xl h-[92vh] sm:h-auto sm:max-h-[88vh] bg-[#130E22] border-t sm:border border-[#2E244A] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator Handle */}
        <div className="w-full pt-2.5 pb-1 flex justify-center sm:hidden bg-[#19122F]">
          <div className="w-12 h-1.5 rounded-full bg-slate-600/60" />
        </div>

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#2E244A] bg-[#19122F]/95 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
              {activeTab === 'privacy' ? <Shield className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 id="legal-modal-title" className="text-sm sm:text-base font-serif font-bold text-white tracking-wide truncate">
                {activeTab === 'privacy' ? 'Privacy Policy & Statement' : 'Terms of Service'}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Effective &bull; October 9, 2026
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher with liquid glass slider */}
        <div className="bg-[#17122A] border-b border-[#2E244A] px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center p-1 bg-[#120B24]/80 backdrop-blur-2xl border border-white/12 rounded-xl relative shadow-md flex-1 sm:flex-initial">
            <button
              onClick={() => onTabChange('privacy')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer relative z-10 ${
                activeTab === 'privacy'
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === 'privacy' && (
                <motion.div
                  layoutId="legalTabPill"
                  className="absolute inset-0 rounded-lg bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                  transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
                />
              )}
              <Shield className="w-3.5 h-3.5 shrink-0 relative z-10" />
              <span className="relative z-10">Privacy Policy</span>
            </button>
            <button
              onClick={() => onTabChange('terms')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer relative z-10 ${
                activeTab === 'terms'
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === 'terms' && (
                <motion.div
                  layoutId="legalTabPill"
                  className="absolute inset-0 rounded-lg bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                  transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
                />
              )}
              <FileText className="w-3.5 h-3.5 shrink-0 relative z-10" />
              <span className="relative z-10">Terms of Service</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 hidden sm:inline-block">
            Section F Directory
          </span>
        </div>

        {/* Content Body (Scrollable, mobile-optimized typography) */}
        <div 
          ref={contentRef}
          className="p-4 sm:p-7 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed custom-scrollbar flex-1"
        >
          {activeTab === 'privacy' ? (
            <div className="space-y-5 max-w-2xl mx-auto">
              
              {/* Section 1: Overview & Scope */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">1</span>
                  Overview & Scope
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Section F Community Hub (&ldquo;the Application&rdquo;, &ldquo;the Platform&rdquo;, &ldquo;the Directory&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is a private directory and networking companion designed exclusively for students, partners, and cohort members of Section F. We respect your privacy and are committed to safeguarding your personal information.
                </p>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed pt-1 border-t border-white/5">
                  <strong className="text-slate-200">Independent Notice:</strong> This Application is an independent community project created for and by Section F members. It is not owned, operated, endorsed, sponsored, or officially affiliated with Harvard University, Harvard Business School, or any of their affiliated entities.
                </p>
              </div>

              {/* Section 2: Information We Collect */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">2</span>
                  Information We Collect
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm">We collect and process the following categories of data to operate the Application:</p>
                
                <div className="space-y-2.5 text-xs sm:text-sm">
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-1 font-semibold">Directory & Profile Information:</strong>
                    <span className="text-slate-300">
                      Information displayed on classmate cards, including full name, preferred name/nickname, pronunciation guide, email addresses (the email address used to authenticate and sign in to the Application, as well as any optional personal, school, or secondary contact emails you choose to provide on your profile), phone number, WhatsApp handle, payment identifiers (Venmo, Zelle), hometown, home country, housing location, undergraduate school/major, pre-MBA company/role, dual-degree status, career interests, MBTI personality type, hobbies, fun facts, partner details, and children details (where provided).
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-1 font-semibold">User Preferences & Local Storage:</strong>
                    <span className="text-slate-300">Saved bookmarks, pinned cards, theme settings, and view preferences are stored directly on your local device storage.</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-1 font-semibold">Device Motion & Sensors:</strong>
                    <span className="text-slate-300">If explicitly permitted by you, the Application accesses your device&rsquo;s accelerometer sensors solely to trigger the interactive &ldquo;shake-to-shuffle&rdquo; card feature. Sensor data is processed entirely on your device in real time and is never recorded, transmitted, or stored on external servers.</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-1 font-semibold">Joint Logistics Data:</strong>
                    <span className="text-slate-300">Sourcing details, freight notes, or expense ledger information inputted into designated section trade tools.</span>
                  </div>
                </div>
              </div>

              {/* Section 3: How We Use Information */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">3</span>
                  How We Use Information
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm">We use your information exclusively to:</p>
                <ul className="space-y-1.5 text-slate-300 pl-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Facilitate cohort networking, team collaboration, classmate discovery, and event coordination.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Maintain directory search, section filters, flashcard navigation, and preference persistence.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Verify authorized access for active section members and partners.</span>
                  </li>
                </ul>

                <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-xs sm:text-sm">
                  <strong className="text-slate-200 block mb-0.5 font-semibold">No Commercial Sale:</strong>
                  <span className="text-slate-300">
                    We never sell, rent, lease, monetize, or share your personal data or contact details with third-party advertisers, data brokers, or external commercial entities under any circumstances.
                  </span>
                </div>
              </div>

              {/* Section 4: Data Storage, Cloud Infrastructure & Security */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">4</span>
                  Data Storage, Cloud Infrastructure & Security
                </h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  <p>
                    <strong className="text-slate-200">Infrastructure:</strong> Directory data is securely hosted and stored using Google Cloud / Firebase Firestore infrastructure with strict environment variable controls and role-based security rules.
                  </p>
                  <p>
                    <strong className="text-slate-200">Financial & Biometric Exclusion:</strong> No sensitive bank passwords, payment account credentials, government ID numbers, or confidential biometric data are ever collected, processed, or stored.
                  </p>
                  <p>
                    <strong className="text-slate-200">Security Safeguards:</strong> We employ SSL/TLS transport layer encryption and standard technical safeguards to protect your data against unauthorized access, loss, or disclosure.
                  </p>
                </div>
              </div>

              {/* Section 5: Your Rights & Profile Management */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">5</span>
                  Your Rights & Profile Management
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm">Every section member has complete control over their profile data:</p>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-0.5">Access & Review:</strong>
                    <span className="text-slate-300">You have the right to review all profile data linked to your identity at any time.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-0.5">Corrections & Updates:</strong>
                    <span className="text-slate-300">You may request updates, corrections, or field modifications to your card profile.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-0.5">Opt-Out & Deletion:</strong>
                    <span className="text-slate-300">You may request that your profile or specific contact details (e.g., phone number, Venmo, partner info) be hidden or permanently removed from the directory. Valid deletion requests will result in complete profile purging from our database within thirty (30) days.</span>
                  </div>
                </div>
              </div>

              {/* Section 6: External Links & Services */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">6</span>
                  External Links & Services
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  The Application may display links to external platforms (e.g., Venmo, Zelle, LinkedIn, WhatsApp, Google Workspace). We are not responsible for the privacy practices, terms, or data handling of these external third-party services.
                </p>
              </div>

              {/* Section 7: Updates to This Policy */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">7</span>
                  Updates to This Policy
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  We reserve the right to update this Privacy Policy as needed to reflect application updates or cohort requirements. Any revisions will be published within the Application with an updated &ldquo;Last Updated&rdquo; timestamp. Continued use of the Application indicates acceptance of the revised policy.
                </p>
              </div>

              {/* Section 8: Contact Us */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">8</span>
                  Contact Us
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  If you have questions regarding this Privacy Policy or wish to request profile edits, corrections, or deletion, please contact the cohort directory administrator or Section F Representatives.
                </p>
              </div>

            </div>
          ) : (
            <div className="space-y-5 max-w-2xl mx-auto">

              {/* Section 1: Acceptance of Terms & Permitted Purpose */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">1</span>
                  Acceptance of Terms & Permitted Purpose
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm">
                  Welcome to Section F Cards. By accessing, browsing, or using this Application, you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).
                </p>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-0.5">Permitted Scope:</strong>
                    <span className="text-slate-300">Access to this directory is intended solely for Section F members, instructors, authorized section peers, and designated section partners for educational, networking, and social engagement.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-0.5">Data Protection:</strong>
                    <span className="text-slate-300">You explicitly agree not to scrape, harvest, crawl, bulk-export, or distribute classmate contact details, photos, or personal profiles to external commercial parties, recruiters, or marketing lists.</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Code of Conduct & Honor Code */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">2</span>
                  Code of Conduct & Honor Code
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm">
                  All interactions, profile bios, and directory usage must strictly adhere to academic honor codes and community standards of mutual respect, inclusivity, and professional conduct.
                </p>
                <p className="text-slate-300 text-xs sm:text-sm">
                  Any unauthorized misuse, harassment, impersonation, automated scraping, or tampering with directory data will result in immediate revocation of Application access and referral to section leadership where appropriate.
                </p>
              </div>

              {/* Section 3: Institutional Independence & Disclaimer */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">3</span>
                  Institutional Independence & Disclaimer
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Section F Cards is an independent tool managed by section members. It is not sponsored, operated, endorsed, or affiliated with Harvard University or Harvard Business School.
                </p>
              </div>

              {/* Section 4: Intellectual Property & Profile Accuracy */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">4</span>
                  Intellectual Property & Profile Accuracy
                </h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-0.5">Application IP:</strong>
                    <span className="text-slate-300">The custom design, interface, flashcard animations, code, and UI components of Section F Cards are protected as application intellectual property.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <strong className="text-slate-200 block mb-0.5">Member Content:</strong>
                    <span className="text-slate-300">Members retain ownership of their contributed profiles and bios, while granting the Application a non-exclusive license to display this content to authorized section peers. Members are responsible for ensuring their bio and contact links remain accurate.</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Disclaimer of Warranties */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">5</span>
                  Disclaimer of Warranties
                </h3>
                <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-[11px] sm:text-xs leading-relaxed text-slate-300 font-mono tracking-wide">
                  THE APPLICATION IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS AS AN INTERNAL COMMUNITY RESOURCE. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND FREEDOM FROM INTERRUPTIONS OR ERRORS. WE DO NOT GUARANTEE THAT THE PLATFORM WILL ALWAYS BE UNINTERRUPTED, SECURE, OR COMPLETELY FREE OF TECHNICAL ISSUES.
                </div>
              </div>

              {/* Section 6: Limitation of Liability */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">6</span>
                  Limitation of Liability
                </h3>
                <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-[11px] sm:text-xs leading-relaxed text-slate-300 font-mono tracking-wide">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PLATFORM DEVELOPERS, OPERATORS, AND SECTION F REPRESENTATIVES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, OR FOR LOSS OF DATA, REPUTATION, OR GOODWILL ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE APPLICATION.
                </div>
              </div>

              {/* Section 7: Indemnification */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">7</span>
                  Indemnification
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  You agree to defend, indemnify, and hold harmless the Application operators and section administrators from any claims, damages, liabilities, or expenses (including legal fees) arising out of your violation of these Terms or misuse of the directory data.
                </p>
              </div>

              {/* Section 8: Account Access & Termination */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">8</span>
                  Account Access & Termination
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  We reserve the right, at our sole discretion, to modify, suspend, or terminate access to the Application for any user who violates these Terms, compromises platform security, or engages in unauthorized data harvesting.
                </p>
              </div>

              {/* Section 9: Governing Law */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">9</span>
                  Governing Law
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the Commonwealth of Massachusetts, without regard to its conflict of law principles.
                </p>
              </div>

              {/* Section 10: Modifications & Inquiries */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2E244A]/60 space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-amber-400 text-xs flex items-center justify-center font-mono">10</span>
                  Modifications & Inquiries
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  We reserve the right to update these Terms at any time to reflect section updates or platform enhancements. Continued use of Section F Cards following an update indicates full acceptance of the updated Terms. For inquiries regarding these Terms, please contact your Section F Representatives or Platform Administrator.
                </p>
              </div>

            </div>
          )}

          {/* Quick Return to Top on Mobile */}
          <div className="pt-2 pb-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                if (contentRef.current) {
                  contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 py-1 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to top</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#17122A] border-t border-[#2E244A] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="text-[11px] text-slate-400 truncate">
            Section F Directory &bull; 2026
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors cursor-pointer text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

