import React from 'react';
import { 
  Globe, 
  Home, 
  Compass, 
  Briefcase, 
  ArrowRight,
  PieChart
} from 'lucide-react';
import { Profile, HousingType } from '../types';
import { InteractiveWorldMap } from './InteractiveWorldMap';
import { playTapSound } from '../utils/soundEffects';

interface InfographicsViewProps {
  profiles: Profile[];
  onSelectCountryFilter: (country: string) => void;
  onSelectHousingFilter: (housing: string) => void;
  onSelectExplorationFilter: (tag: string) => void;
  onSelectIndustryFilter?: (industry: string) => void;
  onSwitchToDeck: () => void;
  selectedCountry: string | null;
  selectedHousing: string | null;
  selectedExploration: string | null;
  selectedIndustry?: string | null;
  onOpenDetails?: (profile: Profile) => void;
  tabKey?: string;
  activeSubView?: string;
}

export const InfographicsView: React.FC<InfographicsViewProps> = ({
  profiles,
  onSelectCountryFilter,
  onSelectHousingFilter,
  onSelectExplorationFilter,
  onSelectIndustryFilter,
  onSwitchToDeck,
  selectedCountry,
  selectedHousing,
  selectedExploration,
  selectedIndustry,
  onOpenDetails,
  tabKey,
  activeSubView,
}) => {
  const total = profiles.length || 1;

  // 1. Country Aggregation
  const countryCounts: { [key: string]: { count: number; code: string } } = {};
  profiles.forEach((p) => {
    if (!countryCounts[p.homeCountry]) {
      countryCounts[p.homeCountry] = { count: 0, code: p.countryCode || 'US' };
    }
    countryCounts[p.homeCountry].count += 1;
  });
  const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1].count - a[1].count);

  // 2. Housing Aggregation
  const housingCounts: Record<HousingType, number> = {
    dorm: 0,
    sfp: 0,
    owa: 0,
    peabody: 0,
    south_campus: 0,
    off_campus: 0
  };
  profiles.forEach((p) => {
    if (housingCounts[p.housingType] !== undefined) {
      housingCounts[p.housingType] += 1;
    }
  });

  const housingList = [
    { key: 'dorm', label: 'HBS Dorms', count: housingCounts.dorm, color: 'from-purple-600 to-purple-400' },
    { key: 'sfp', label: 'Soldiers Field Park', count: housingCounts.sfp, color: 'from-blue-600 to-cyan-400' },
    { key: 'owa', label: 'One Western Ave', count: housingCounts.owa, color: 'from-emerald-600 to-teal-400' },
    { key: 'off_campus', label: 'Off-Campus', count: housingCounts.off_campus, color: 'from-amber-600 to-yellow-400' },
  ];

  // 3. Post-HBS Exploration Aggregation
  const explorationCounts: { [tag: string]: number } = {};
  profiles.forEach((p) => {
    p.postHbsExploration.forEach((tag) => {
      explorationCounts[tag] = (explorationCounts[tag] || 0) + 1;
    });
  });
  const sortedExplorations = Object.entries(explorationCounts).sort((a, b) => b[1] - a[1]);

  // 4. Pre-HBS Industry Aggregation
  const industryCounts: { [ind: string]: number } = {};
  profiles.forEach((p) => {
    industryCounts[p.preHbsIndustry] = (industryCounts[p.preHbsIndustry] || 0) + 1;
  });
  const sortedIndustries = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]);

  const getEmojiFlag = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    return String.fromCodePoint(...countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-3.5 pb-20 pt-1 text-slate-100">
      
      {/* 1. Top Banner - Clean Single Row */}
      <div className="bg-gradient-to-r from-[#581C87] to-[#171226] p-3 rounded-2xl border border-[#F59E0B]/30 shadow-lg flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-[#0B0813] border border-[#F59E0B]/40 text-[#F59E0B] shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-extrabold text-white leading-tight truncate">
              Demographics
            </h2>
            <p className="text-[10px] text-purple-200 truncate">
              {profiles.length} Classmates · {sortedCountries.length} Countries
            </p>
          </div>
        </div>

        <button
          onClick={onSwitchToDeck}
          className="py-1 px-3 rounded-xl bg-[#0B0813] hover:bg-[#581C87] text-[#F59E0B] hover:text-white font-bold text-xs flex items-center space-x-1 border border-[#2E244A] transition-all cursor-pointer shrink-0"
        >
          <span>Deck</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Real Interactive Geographic Map */}
      <InteractiveWorldMap
        profiles={profiles}
        selectedCountry={selectedCountry}
        onSelectCountry={onSelectCountryFilter}
        onSwitchToDeck={onSwitchToDeck}
        onOpenDetails={onOpenDetails}
        tabKey={tabKey}
        activeSubView={activeSubView}
      />

      {/* 3. Global Origins & Flags - Clean 1-Row Header & Ribbon */}
      <div className="bg-[#171226] p-3 rounded-2xl border border-[#2E244A] shadow-xl space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Globe className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <h3 className="text-xs font-bold text-white truncate">Global Origins</h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#F59E0B] bg-[#0B0813] px-2 py-0.5 rounded-full border border-[#2E244A] shrink-0">
            {sortedCountries.length} Nations
          </span>
        </div>

        {/* Horizontal Flags Ribbon - Clean Single Line Per Pill */}
        <div className="flex space-x-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {sortedCountries.map(([country, data]) => {
            const isSelected = selectedCountry === country;
            return (
              <button
                key={country}
                onClick={() => {
                  playTapSound();
                  onSelectCountryFilter(country);
                  onSwitchToDeck();
                }}
                className={`flex-shrink-0 flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#581C87] border-[#F59E0B] text-white shadow ring-1 ring-[#F59E0B]/50'
                    : 'bg-[#0B0813] border-[#2E244A] text-slate-300 hover:border-slate-500'
                }`}
                title={`Filter deck by ${country}`}
              >
                <span className="text-base font-emoji leading-none filter drop-shadow">
                  {getEmojiFlag(data.code)}
                </span>
                <span className="text-xs font-bold whitespace-nowrap">
                  {country}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-[#F59E0B] text-black' : 'bg-[#2E244A] text-amber-300'
                }`}>
                  {data.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Housing Distribution - Strictly 1 Single Line Per Location */}
      <div className="bg-[#171226] p-3 rounded-2xl border border-[#2E244A] shadow-xl space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Home className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <h3 className="text-xs font-bold text-white truncate">Campus Housing</h3>
          </div>
          <span className="text-[10px] text-slate-400">Tap to view in deck</span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {housingList.map((item) => {
            const isSelected = selectedHousing === item.key || selectedHousing === item.label;
            const pct = Math.round((item.count / total) * 100);

            return (
              <div
                key={item.key}
                onClick={() => {
                  playTapSound();
                  onSelectHousingFilter(item.key);
                  onSwitchToDeck();
                }}
                className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 text-xs ${
                  isSelected
                    ? 'bg-[#581C87]/40 border-[#F59E0B]'
                    : 'bg-[#0B0813] border-[#2E244A] hover:border-slate-600'
                }`}
                title={`View ${item.label} in deck`}
              >
                {/* 1-Line Label */}
                <span className="font-bold text-white shrink-0 text-xs truncate max-w-[140px]">
                  {item.label}
                </span>

                {/* Inline Progress Bar */}
                <div className="flex-1 bg-[#171226] h-1.5 rounded-full overflow-hidden mx-1 min-w-[50px]">
                  <div
                    className={`bg-gradient-to-r ${item.color} h-full rounded-full`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* 1-Line Count & Percent */}
                <span className="font-mono text-[11px] font-bold text-purple-300 shrink-0">
                  {item.count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Post-HBS Career Goals - Strictly 1 Single Line Per Goal */}
      <div className="bg-[#171226] p-3 rounded-2xl border border-[#2E244A] shadow-xl space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Compass className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <h3 className="text-xs font-bold text-white truncate">Career Exploration</h3>
          </div>
          <span className="text-[10px] text-slate-400">Tap to view in deck</span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {sortedExplorations.slice(0, 6).map(([tag, count]) => {
            const isSelected = selectedExploration === tag;
            const pct = Math.round((count / total) * 100);

            return (
              <div
                key={tag}
                onClick={() => {
                  playTapSound();
                  onSelectExplorationFilter(tag);
                  onSwitchToDeck();
                }}
                className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 text-xs ${
                  isSelected
                    ? 'bg-[#581C87]/40 border-[#F59E0B]'
                    : 'bg-[#0B0813] border-[#2E244A] hover:border-[#F59E0B]/50'
                }`}
                title={`View ${tag} in deck`}
              >
                <span className="font-bold text-white shrink-0 text-xs truncate max-w-[170px]">
                  {tag}
                </span>

                <div className="flex-1 bg-[#171226] h-1.5 rounded-full overflow-hidden mx-1 min-w-[40px]">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full"
                    style={{ width: `${Math.min(pct * 2, 100)}%` }}
                  />
                </div>

                <span className="font-mono text-[11px] font-bold text-[#F59E0B] shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Pre-HBS Industries - Strictly 1 Single Line Per Industry */}
      <div className="bg-[#171226] p-3 rounded-2xl border border-[#2E244A] shadow-xl space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Briefcase className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <h3 className="text-xs font-bold text-white truncate">Prior Industries</h3>
          </div>
          <span className="text-[10px] text-slate-400">Tap to view in deck</span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {sortedIndustries.map(([ind, count]) => {
            const isSelected = selectedIndustry === ind;
            const pct = Math.round((count / total) * 100);

            return (
              <div
                key={ind}
                onClick={() => {
                  playTapSound();
                  if (onSelectIndustryFilter) {
                    onSelectIndustryFilter(ind);
                  }
                  onSwitchToDeck();
                }}
                className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 text-xs ${
                  isSelected
                    ? 'bg-[#581C87]/40 border-[#F59E0B]'
                    : 'bg-[#0B0813] border-[#2E244A] hover:border-[#F59E0B]/50'
                }`}
                title={`View ${ind} in deck`}
              >
                <span className="font-bold text-slate-200 shrink-0 text-xs truncate max-w-[170px]">
                  {ind}
                </span>

                <div className="flex-1 bg-[#171226] h-1.5 rounded-full overflow-hidden mx-1 min-w-[40px]">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full"
                    style={{ width: `${Math.min(pct * 2, 100)}%` }}
                  />
                </div>

                <span className="font-mono text-[11px] font-bold text-purple-300 shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

