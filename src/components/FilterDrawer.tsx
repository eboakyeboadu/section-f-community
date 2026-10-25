import React, { useState, useMemo } from 'react';
import { 
  X, 
  RotateCcw, 
  Check, 
  SlidersHorizontal, 
  MapPin, 
  Briefcase, 
  Compass, 
  Globe, 
  Bookmark, 
  Search, 
  Plus 
} from 'lucide-react';
import { FilterState } from '../types';
import { COUNTRIES_LIST } from '../data/constants';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableCountries: string[];
  availableIndustries: string[];
  availableExplorations: string[];
}

const HOUSING_BUILDINGS = [
  'Mellon Hall',
  'Chase Hall',
  'Gallatin Hall',
  'Hamilton Hall',
  'McCulloch Hall',
  'Morris Hall',
  'Soldiers Field Park',
  'One Western Avenue',
  'Peabody Terrace',
  '100 South Campus Drive',
  'Off-Campus',
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  availableCountries,
  availableIndustries,
  availableExplorations,
}) => {
  // Category-specific search queries for "search, click, and add"
  const [countryQuery, setCountryQuery] = useState('');
  const [housingQuery, setHousingQuery] = useState('');
  const [explorationQuery, setExplorationQuery] = useState('');
  const [industryQuery, setIndustryQuery] = useState('');

  if (!isOpen) return null;

  // Active collections
  const selectedCountries = filters.countries || (filters.country ? [filters.country] : []);
  const selectedHousing = filters.housingTypes || (filters.housingType ? [filters.housingType] : []);
  const selectedIndustries = filters.industries || (filters.industry ? [filters.industry] : []);
  const selectedExplorations = filters.explorations || (filters.exploration ? [filters.exploration] : []);

  // Total active filter count
  const totalActiveCount = 
    selectedCountries.length + 
    selectedHousing.length + 
    selectedIndustries.length + 
    selectedExplorations.length + 
    (filters.savedOnly ? 1 : 0);

  // Toggle handlers
  const handleToggleCountry = (country: string) => {
    const next = selectedCountries.includes(country)
      ? selectedCountries.filter((c) => c !== country)
      : [...selectedCountries, country];
    onFilterChange({
      ...filters,
      countries: next,
      country: next[0] || null,
    });
    setCountryQuery('');
  };

  const handleRemoveCountry = (country: string) => {
    const next = selectedCountries.filter((c) => c !== country);
    onFilterChange({
      ...filters,
      countries: next,
      country: next[0] || null,
    });
  };

  const handleToggleHousing = (building: string) => {
    const next = selectedHousing.includes(building)
      ? selectedHousing.filter((h) => h !== building)
      : [...selectedHousing, building];
    onFilterChange({
      ...filters,
      housingTypes: next,
      housingType: next[0] || null,
    });
    setHousingQuery('');
  };

  const handleRemoveHousing = (building: string) => {
    const next = selectedHousing.filter((h) => h !== building);
    onFilterChange({
      ...filters,
      housingTypes: next,
      housingType: next[0] || null,
    });
  };

  const handleToggleExploration = (exp: string) => {
    const trimmed = exp.trim();
    if (!trimmed) return;
    const next = selectedExplorations.includes(trimmed)
      ? selectedExplorations.filter((e) => e.toLowerCase() !== trimmed.toLowerCase())
      : [...selectedExplorations, trimmed];
    onFilterChange({
      ...filters,
      explorations: next,
      exploration: next[0] || null,
    });
    setExplorationQuery('');
  };

  const handleRemoveExploration = (exp: string) => {
    const next = selectedExplorations.filter((e) => e !== exp);
    onFilterChange({
      ...filters,
      explorations: next,
      exploration: next[0] || null,
    });
  };

  const handleToggleIndustry = (ind: string) => {
    const trimmed = ind.trim();
    if (!trimmed) return;
    const next = selectedIndustries.includes(trimmed)
      ? selectedIndustries.filter((i) => i.toLowerCase() !== trimmed.toLowerCase())
      : [...selectedIndustries, trimmed];
    onFilterChange({
      ...filters,
      industries: next,
      industry: next[0] || null,
    });
    setIndustryQuery('');
  };

  const handleRemoveIndustry = (ind: string) => {
    const next = selectedIndustries.filter((i) => i !== ind);
    onFilterChange({
      ...filters,
      industries: next,
      industry: next[0] || null,
    });
  };

  const handleToggleSaved = () => {
    onFilterChange({ ...filters, savedOnly: !filters.savedOnly });
  };

  const resetAll = () => {
    onFilterChange({
      countries: [],
      housingTypes: [],
      industries: [],
      explorations: [],
      country: null,
      housingType: null,
      industry: null,
      exploration: null,
      savedOnly: false,
      searchQuery: '',
    });
    setCountryQuery('');
    setHousingQuery('');
    setExplorationQuery('');
    setIndustryQuery('');
  };

  // 1. Filtered Country Suggestions (across all 195+ countries)
  const filteredCountryList = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) {
      // When query is empty, return top cohort countries first
      return availableCountries;
    }
    return COUNTRIES_LIST.filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => c.name)
      .slice(0, 20); // Top 20 instant matches
  }, [countryQuery, availableCountries]);

  // 2. Filtered Housing Suggestions
  const filteredHousingList = useMemo(() => {
    const q = housingQuery.trim().toLowerCase();
    if (!q) return HOUSING_BUILDINGS;
    return HOUSING_BUILDINGS.filter((b) => b.toLowerCase().includes(q));
  }, [housingQuery]);

  // 3. Filtered Explorations Suggestions (with support for typing custom ones)
  const filteredExplorationsList = useMemo(() => {
    const q = explorationQuery.trim().toLowerCase();
    if (!q) return availableExplorations;
    return availableExplorations.filter((e) => e.toLowerCase().includes(q));
  }, [explorationQuery, availableExplorations]);

  // 4. Filtered Industry Suggestions (with support for typing custom ones)
  const filteredIndustriesList = useMemo(() => {
    const q = industryQuery.trim().toLowerCase();
    if (!q) return availableIndustries;
    return availableIndustries.filter((i) => i.toLowerCase().includes(q));
  }, [industryQuery, availableIndustries]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#171226] border-l border-[#2E244A] h-full flex flex-col shadow-2xl animate-slideLeft">
        
        {/* Header */}
        <div className="p-4 border-b border-[#2E244A] flex items-center justify-between bg-[#120D20] shrink-0">
          <div className="flex items-center space-x-2.5">
            <SlidersHorizontal className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="font-bold text-sm text-white">Filter Section F</h3>
            {totalActiveCount > 0 && (
              <span className="text-[11px] font-bold bg-[#F59E0B] text-[#0B0813] px-2 py-0.5 rounded-full shadow-sm">
                {totalActiveCount} Active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {totalActiveCount > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs text-[#F59E0B] hover:underline flex items-center space-x-1 cursor-pointer font-medium px-2 py-1 rounded hover:bg-[#F59E0B]/10 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2E244A] transition-colors cursor-pointer"
              title="Close Filter Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs text-slate-200 divide-y divide-[#2E244A]/50">

          {/* Saved / Bookmarked Only Quick Toggle */}
          <div className="p-3 rounded-2xl bg-[#0B0813] border border-[#2E244A] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Bookmark className={`w-4 h-4 ${filters.savedOnly ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-slate-400'}`} />
              <div>
                <p className="font-bold text-white text-xs">Saved Classmates Only</p>
                <p className="text-[10px] text-slate-400">Show only bookmarked profiles</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSaved}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                filters.savedOnly ? 'bg-[#F59E0B]' : 'bg-[#2E244A]'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  filters.savedOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* 1. Home Country (Search, Click & Add across 195+ Countries) */}
          <div className="pt-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 text-[11px]">
                <Globe className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Home Country ({COUNTRIES_LIST.length} Nations)</span>
              </label>
              {selectedCountries.length > 0 && (
                <span className="text-[10px] font-bold text-[#F59E0B]">
                  {selectedCountries.length} selected
                </span>
              )}
            </div>

            {/* Active Selected Countries Tray */}
            {selectedCountries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#0B0813] border border-[#581C87]/50 shadow-inner">
                {selectedCountries.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#581C87] text-white text-[11px] font-semibold border border-[#F59E0B]/40 shadow-sm animate-fadeIn"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCountry(c)}
                      className="p-0.5 rounded-full hover:bg-black/30 text-amber-300 hover:text-white transition-colors cursor-pointer"
                      title={`Remove ${c}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Country Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                placeholder="Search country to add (e.g. Nigeria, France)..."
                className="w-full bg-[#0B0813] text-white text-xs pl-8 pr-8 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none transition-colors"
              />
              {countryQuery && (
                <button
                  type="button"
                  onClick={() => setCountryQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Country Pills or Search Matches */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-400 font-medium">
                {countryQuery ? 'Matching Countries:' : 'Quick Select (Represented in Section F):'}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredCountryList.length > 0 ? (
                  filteredCountryList.map((country) => {
                    const isSelected = selectedCountries.includes(country);
                    return (
                      <button
                        type="button"
                        key={country}
                        onClick={() => handleToggleCountry(country)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                          isSelected
                            ? 'bg-[#F59E0B] text-[#0B0813] font-bold border-[#F59E0B] shadow-sm'
                            : 'bg-[#0B0813] text-slate-300 border-[#2E244A] hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-[#0B0813]" />}
                        <span>{country}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="w-full text-center py-2 text-[11px] text-slate-500">
                    No countries matching &quot;{countryQuery}&quot;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Campus Housing (Multi-Select & Searchable) */}
          <div className="pt-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Campus Housing</span>
              </label>
              {selectedHousing.length > 0 && (
                <span className="text-[10px] font-bold text-[#F59E0B]">
                  {selectedHousing.length} selected
                </span>
              )}
            </div>

            {/* Active Selected Housing Tray */}
            {selectedHousing.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#0B0813] border border-[#581C87]/50 shadow-inner">
                {selectedHousing.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#581C87] text-white text-[11px] font-semibold border border-[#F59E0B]/40 shadow-sm animate-fadeIn"
                  >
                    <span>{h}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHousing(h)}
                      className="p-0.5 rounded-full hover:bg-black/30 text-amber-300 hover:text-white transition-colors cursor-pointer"
                      title={`Remove ${h}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Housing Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={housingQuery}
                onChange={(e) => setHousingQuery(e.target.value)}
                placeholder="Search housing (e.g. Mellon, SFP)..."
                className="w-full bg-[#0B0813] text-white text-xs pl-8 pr-8 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none transition-colors"
              />
              {housingQuery && (
                <button
                  type="button"
                  onClick={() => setHousingQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Housing Buildings Quick Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {filteredHousingList.map((item) => {
                const isSelected = selectedHousing.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => handleToggleHousing(item)}
                    className={`p-2 rounded-xl text-left font-medium border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#581C87] border-[#F59E0B] text-white font-bold shadow-sm'
                        : 'bg-[#0B0813] border-[#2E244A] text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Target Career Exploration (Search, Click & Add + Custom Type) */}
          <div className="pt-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 text-[11px]">
                <Compass className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Target Career Exploration</span>
              </label>
              {selectedExplorations.length > 0 && (
                <span className="text-[10px] font-bold text-[#F59E0B]">
                  {selectedExplorations.length} selected
                </span>
              )}
            </div>

            {/* Active Selected Explorations Tray */}
            {selectedExplorations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#0B0813] border border-[#581C87]/50 shadow-inner">
                {selectedExplorations.map((exp) => (
                  <span
                    key={exp}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#581C87] text-white text-[11px] font-semibold border border-[#F59E0B]/40 shadow-sm animate-fadeIn"
                  >
                    <span>{exp}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExploration(exp)}
                      className="p-0.5 rounded-full hover:bg-black/30 text-amber-300 hover:text-white transition-colors cursor-pointer"
                      title={`Remove ${exp}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Exploration Search & Type-to-Add Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={explorationQuery}
                    onChange={(e) => setExplorationQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (explorationQuery.trim()) {
                          handleToggleExploration(explorationQuery.trim());
                        }
                      }
                    }}
                    placeholder="Search or type interest to add..."
                    className="w-full bg-[#0B0813] text-white text-xs pl-8 pr-8 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none transition-colors"
                  />
                  {explorationQuery && (
                    <button
                      type="button"
                      onClick={() => setExplorationQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {explorationQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleToggleExploration(explorationQuery.trim())}
                    className="px-3 py-2 rounded-xl bg-[#581C87] hover:bg-[#6B21A8] text-white text-xs font-semibold flex items-center space-x-1 border border-[#F59E0B]/40 cursor-pointer shadow-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {explorationQuery.trim() && !filteredExplorationsList.some(e => e.toLowerCase() === explorationQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => handleToggleExploration(explorationQuery.trim())}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#581C87]/40 hover:bg-[#581C87] border border-[#F59E0B]/40 text-left text-[11px] text-amber-200 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Add custom exploration: <strong>&ldquo;{explorationQuery.trim()}&rdquo;</strong></span>
                  <Plus className="w-3 h-3 text-[#F59E0B]" />
                </button>
              )}
            </div>

            {/* Quick Exploration Pills */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredExplorationsList.map((exp) => {
                const isSelected = selectedExplorations.includes(exp);
                return (
                  <button
                    type="button"
                    key={exp}
                    onClick={() => handleToggleExploration(exp)}
                    className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] cursor-pointer flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-[#F59E0B] text-[#0B0813] font-bold border-[#F59E0B] shadow-sm'
                        : 'bg-[#0B0813] text-slate-300 border-[#2E244A] hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#0B0813]" />}
                    <span>{exp}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Pre-HBS Industry (Search, Click & Add + Custom Type) */}
          <div className="pt-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 text-[11px]">
                <Briefcase className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Pre-HBS Industry</span>
              </label>
              {selectedIndustries.length > 0 && (
                <span className="text-[10px] font-bold text-[#F59E0B]">
                  {selectedIndustries.length} selected
                </span>
              )}
            </div>

            {/* Active Selected Industries Tray */}
            {selectedIndustries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#0B0813] border border-[#581C87]/50 shadow-inner">
                {selectedIndustries.map((ind) => (
                  <span
                    key={ind}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#581C87] text-white text-[11px] font-semibold border border-[#F59E0B]/40 shadow-sm animate-fadeIn"
                  >
                    <span>{ind}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIndustry(ind)}
                      className="p-0.5 rounded-full hover:bg-black/30 text-amber-300 hover:text-white transition-colors cursor-pointer"
                      title={`Remove ${ind}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Industry Search & Type-to-Add Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={industryQuery}
                    onChange={(e) => setIndustryQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (industryQuery.trim()) {
                          handleToggleIndustry(industryQuery.trim());
                        }
                      }
                    }}
                    placeholder="Search or type industry to add..."
                    className="w-full bg-[#0B0813] text-white text-xs pl-8 pr-8 py-2 rounded-xl border border-[#2E244A] focus:border-[#F59E0B] focus:outline-none transition-colors"
                  />
                  {industryQuery && (
                    <button
                      type="button"
                      onClick={() => setIndustryQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {industryQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleToggleIndustry(industryQuery.trim())}
                    className="px-3 py-2 rounded-xl bg-[#581C87] hover:bg-[#6B21A8] text-white text-xs font-semibold flex items-center space-x-1 border border-[#F59E0B]/40 cursor-pointer shadow-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {industryQuery.trim() && !filteredIndustriesList.some(i => i.toLowerCase() === industryQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => handleToggleIndustry(industryQuery.trim())}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#581C87]/40 hover:bg-[#581C87] border border-[#F59E0B]/40 text-left text-[11px] text-amber-200 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Add custom industry: <strong>&ldquo;{industryQuery.trim()}&rdquo;</strong></span>
                  <Plus className="w-3 h-3 text-[#F59E0B]" />
                </button>
              )}
            </div>

            {/* Quick Industry Pills */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredIndustriesList.map((ind) => {
                const isSelected = selectedIndustries.includes(ind);
                return (
                  <button
                    type="button"
                    key={ind}
                    onClick={() => handleToggleIndustry(ind)}
                    className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] cursor-pointer flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-[#F59E0B] text-[#0B0813] font-bold border-[#F59E0B] shadow-sm'
                        : 'bg-[#0B0813] text-slate-300 border-[#2E244A] hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#0B0813]" />}
                    <span>{ind}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Apply Button */}
        <div className="p-4 border-t border-[#2E244A] bg-[#120D20] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#581C87] to-[#7E22CE] text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg border border-[#F59E0B]/40 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 text-[#F59E0B]" />
            <span>Apply Filters ({totalActiveCount})</span>
          </button>
        </div>

      </div>
    </div>
  );
};

