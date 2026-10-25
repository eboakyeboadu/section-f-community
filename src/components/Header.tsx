import React from 'react';
import { motion } from 'motion/react';
import { SlidersHorizontal, Search, Layers, BarChart2, Lock, LogIn, Bell } from 'lucide-react';
import { TabType, CardSubView, FilterState } from '../types';
import { playTapSound } from '../utils/soundEffects';

interface HeaderProps {
  currentTab: TabType;
  cardSubView: CardSubView;
  isGuest?: boolean;
  onSubViewChange: (subView: CardSubView) => void;
  onOpenFilter: () => void;
  onToggleSearch: () => void;
  showSearch: boolean;
  filters: FilterState;
  onSearchChange: (q: string) => void;
  totalClassmates: number;
  onSignInRequested?: () => void;
  unreadNotificationCount?: number;
  onToggleNotifications?: () => void;
  showNotifications?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  cardSubView,
  isGuest = false,
  onSubViewChange,
  onOpenFilter,
  onToggleSearch,
  showSearch,
  filters,
  onSearchChange,
  totalClassmates,
  onSignInRequested,
  unreadNotificationCount = 0,
  onToggleNotifications,
  showNotifications = false,
}) => {

  const activeFilterCount = [
    filters.country,
    filters.housingType,
    filters.industry,
    filters.exploration,
  ].filter(Boolean).length;

  return (
    <header className="sticky top-0 z-30 bg-[#0E091B]/85 backdrop-blur-2xl border-b border-white/10 px-3.5 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2.5">
      <div className="max-w-md sm:max-w-4xl mx-auto">
        {/* Top brand row */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Section Identity (Tap to smoothly scroll to top) */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center space-x-2.5 min-w-0 py-0.5 cursor-pointer group active:scale-[0.98] transition-transform"
            title="Tap to scroll to top"
          >
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight group-hover:text-amber-400 transition-colors">
                  Section F
                </h1>
                <span className="text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-md bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-amber-300 border border-amber-400/30 shadow-[0_1px_6px_rgba(0,0,0,0.3)]">
                  Class of '28
                </span>
                {isGuest && (
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-600/30 flex items-center space-x-0.5 leading-none">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Guest</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                <p className="text-[11px] text-slate-300 font-medium tracking-normal truncate">
                  {totalClassmates} Classmates
                </p>
              </div>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {isGuest && onSignInRequested && (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => {
                  playTapSound();
                  onSignInRequested();
                }}
                className="py-1.5 px-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] flex items-center space-x-1 shadow-md transition-all cursor-pointer"
                title="Sign in to have full access"
              >
                <LogIn className="w-3 h-3" />
                <span className="hidden xs:inline">Sign In</span>
              </motion.button>
            )}

            {/* Search button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playTapSound();
                onToggleSearch();
              }}
              aria-label="Toggle Search"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showSearch || filters.searchQuery
                  ? 'bg-[#581C87]/50 border-amber-400/50 text-amber-400'
                  : 'bg-[#18112C] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
            </motion.button>



            {/* Notifications Bell */}
            {!isGuest && onToggleNotifications && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  playTapSound();
                  onToggleNotifications();
                }}
                aria-label="Coffee Chat Notifications"
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                  showNotifications
                    ? 'bg-[#581C87]/50 border-amber-400/50 text-amber-400'
                    : 'bg-[#18112C] border-white/10 text-slate-300 hover:text-white'
                }`}
                title="Coffee Chat Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-amber-400 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {unreadNotificationCount}
                  </span>
                )}
              </motion.button>
            )}

            {/* Filter Drawer Trigger */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playTapSound();
                onOpenFilter();
              }}
              aria-label="Open Filter"
              className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-[#581C87]/50 border-amber-400/50 text-amber-400'
                  : 'bg-[#18112C] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center shadow-md">
                  {activeFilterCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Search Bar Input (when expanded) */}
        {showSearch && (
          <div className="mt-2 animate-fadeIn">
            <div className="relative">
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name, company, country, hobby..."
                className="w-full bg-[#18112C] text-white text-xs pl-8 pr-8 py-2 rounded-xl border border-white/15 focus:border-amber-400 focus:outline-none placeholder-slate-500 shadow-inner"
                autoFocus
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {filters.searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sub-view switcher for Cards tab - Apple sliding segmented slider with crystal clear glass effect */}
        {currentTab === 'cards' && (
          <div className="mt-2.5 flex p-1 bg-[#120B24]/90 backdrop-blur-2xl rounded-2xl border border-white/10 relative shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <button
              onClick={() => {
                if (cardSubView !== 'deck') {
                  playTapSound();
                  onSubViewChange('deck');
                }
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer relative z-10 ${
                cardSubView === 'deck' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cardSubView === 'deck' && (
                <motion.div
                  layoutId="headerSubViewPill"
                  className="absolute inset-0 rounded-xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                  transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
                />
              )}
              <Layers className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Deck</span>
            </button>
            <button
              onClick={() => {
                if (cardSubView !== 'infographics') {
                  playTapSound();
                  onSubViewChange('infographics');
                }
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer relative z-10 ${
                cardSubView === 'infographics' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cardSubView === 'infographics' && (
                <motion.div
                  layoutId="headerSubViewPill"
                  className="absolute inset-0 rounded-xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                  transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
                />
              )}
              <BarChart2 className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Section Infographics</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

