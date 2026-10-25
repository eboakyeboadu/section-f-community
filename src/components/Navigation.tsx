import React from 'react';
import { motion } from 'motion/react';
import { Layers, SunMedium, User as UserIcon, BarChart2, Coffee, Calendar as CalendarIcon } from 'lucide-react';
import { TabType, CardSubView } from '../types';
import { playTapSound } from '../utils/soundEffects';

interface NavigationProps {
  currentTab: TabType;
  cardSubView: CardSubView;
  onTabChange: (tab: TabType) => void;
  onSubViewChange: (subView: CardSubView) => void;
  userPhotoUrl?: string;
  hasUnreadSpotlight?: boolean;
  activeCoffeeChatsCount?: number;
  todayEventsCount?: number;
  isGuest?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  cardSubView,
  onTabChange,
  userPhotoUrl,
  activeCoffeeChatsCount = 0,
  todayEventsCount = 0,
  isGuest = false,
}) => {
  const handleTabClick = (tab: TabType) => {
    if (tab !== currentTab) {
      playTapSound();
    }
    onTabChange(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-1 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-[#120B24]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.6)] flex items-center justify-around relative h-[62px]">
          
          {/* Tab 1: Cards */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleTabClick('cards')}
            className={`flex-1 h-[50px] px-1 rounded-2xl flex flex-col items-center justify-center relative transition-colors duration-200 cursor-pointer select-none ${
              currentTab === 'cards' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentTab === 'cards' && (
              <motion.div
                layoutId="activeNavDockPill"
                className="absolute inset-0 rounded-2xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.7 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="w-5 h-5 flex items-center justify-center">
                {cardSubView === 'deck' ? (
                  <Layers className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'cards' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'stroke-2'}`} />
                ) : (
                  <BarChart2 className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'cards' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'stroke-2'}`} />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1 h-3.5 flex items-center leading-none">
                {currentTab === 'cards' && cardSubView === 'infographics' ? 'Charts' : 'Directory'}
              </span>
            </div>
          </motion.button>

          {/* Tab 2: Spotlight */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleTabClick('spotlight')}
            className={`flex-1 h-[50px] px-1 rounded-2xl flex flex-col items-center justify-center relative transition-colors duration-200 cursor-pointer select-none ${
              currentTab === 'spotlight' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentTab === 'spotlight' && (
              <motion.div
                layoutId="activeNavDockPill"
                className="absolute inset-0 rounded-2xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.7 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="w-5 h-5 flex items-center justify-center relative">
                <SunMedium className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'spotlight' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'stroke-2'}`} />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1 h-3.5 flex items-center leading-none">
                Spotlight
              </span>
            </div>
          </motion.button>

          {/* Tab 3: Coffee Chats (Hub for Coffee Chats & Cohort Calendar) */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleTabClick('coffee_chats')}
            className={`flex-1 h-[50px] px-1 rounded-2xl flex flex-col items-center justify-center relative transition-colors duration-200 cursor-pointer min-w-0 select-none ${
              currentTab === 'coffee_chats' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentTab === 'coffee_chats' && (
              <motion.div
                layoutId="activeNavDockPill"
                className="absolute inset-0 rounded-2xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.7 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="w-5 h-5 flex items-center justify-center relative">
                <Coffee className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'coffee_chats' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'stroke-2'}`} />
                {activeCoffeeChatsCount > 0 ? (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 bg-amber-400 text-slate-950 font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-md"
                  >
                    {activeCoffeeChatsCount}
                  </motion.span>
                ) : todayEventsCount > 0 ? (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-md"
                    title="Events scheduled today"
                  >
                    {todayEventsCount}
                  </motion.span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1 h-3.5 flex items-center leading-none whitespace-nowrap">
                Coffee Chats
              </span>
            </div>
          </motion.button>

          {/* Tab 4: Profile */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleTabClick('my_card')}
            className={`flex-1 h-[50px] px-1 rounded-2xl flex flex-col items-center justify-center relative transition-colors duration-200 cursor-pointer select-none ${
              currentTab === 'my_card' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentTab === 'my_card' && (
              <motion.div
                layoutId="activeNavDockPill"
                className="absolute inset-0 rounded-2xl bg-white/[0.07] border border-white/10 border-b-amber-400/30 shadow-[0_2px_10px_rgba(0,0,0,0.3)] transform-gpu will-change-transform"
                transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.7 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="w-5 h-5 flex items-center justify-center">
                {userPhotoUrl && userPhotoUrl.trim() !== '' ? (
                  <img
                    src={userPhotoUrl}
                    alt="Profile"
                    className={`w-5 h-5 rounded-full object-cover transition-all ${
                      currentTab === 'my_card' ? 'ring-2 ring-amber-400 scale-105' : 'opacity-80'
                    }`}
                  />
                ) : (
                  <UserIcon className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'my_card' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'stroke-2'}`} />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1 h-3.5 flex items-center leading-none">
                Profile
              </span>
            </div>
          </motion.button>

        </div>
      </div>
    </nav>
  );
};

