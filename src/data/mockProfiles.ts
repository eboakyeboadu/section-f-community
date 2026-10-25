import { Profile, HousingType, HousingBuilding } from '../types';
import seedCardsJson from '../../seed_cards.json';

const COUNTRY_CODE_MAP: Record<string, string> = {
  'United States': 'US',
  'United Kingdom': 'GB',
  'Australia': 'AU',
  'India': 'IN',
  'Mexico': 'MX',
  'Chile': 'CL',
  'China': 'CN',
  'Taiwan': 'TW',
  'Japan': 'JP',
  'Brazil': 'BR',
  'South Korea': 'KR',
  'Saudi Arabia': 'SA',
  'New Zealand': 'NZ',
  'Israel': 'IL',
  'Italy': 'IT',
  'Thailand': 'TH',
  'Germany': 'DE',
  'France': 'FR',
  'Spain': 'ES',
  'Canada': 'CA',
  'Nigeria': 'NG',
  'Ghana': 'GH',
  'Kenya': 'KE',
  'South Africa': 'ZA',
  'United Arab Emirates': 'AE',
  'Singapore': 'SG',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Ireland': 'IE',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Argentina': 'AR',
  'Colombia': 'CO',
};

function parseHousing(raw?: string | null): { building: HousingBuilding; type: HousingType } {
  if (!raw) return { building: 'Off-Campus', type: 'off_campus' };
  const lower = raw.toLowerCase();
  if (lower.includes('soldier') || lower.includes('sfp')) return { building: 'Soldiers Field Park', type: 'sfp' };
  if (lower.includes('western') || lower.includes('owa')) return { building: 'One Western Avenue', type: 'owa' };
  if (lower.includes('peabody')) return { building: 'Peabody Terrace', type: 'peabody' };
  if (lower.includes('south campus') || lower.includes('100 south')) return { building: '100 South Campus Drive', type: 'south_campus' };
  if (lower.includes('hamilton')) return { building: 'Hamilton Hall', type: 'dorm' };
  if (lower.includes('morris')) return { building: 'Morris Hall', type: 'dorm' };
  if (lower.includes('chase')) return { building: 'Chase Hall', type: 'dorm' };
  if (lower.includes('gallatin')) return { building: 'Gallatin Hall', type: 'dorm' };
  if (lower.includes('mcculloch')) return { building: 'McCulloch Hall', type: 'dorm' };
  if (lower.includes('mellon')) return { building: 'Mellon Hall', type: 'dorm' };
  return { building: 'Off-Campus', type: 'off_campus' };
}

function inferIndustry(company?: string | null, role?: string | null): string {
  const text = `${company || ''} ${role || ''}`.toLowerCase();
  if (text.includes('mckinsey') || text.includes('bcg') || text.includes('bain') || text.includes('consult')) return 'Consulting';
  if (text.includes('equity') || text.includes('invest') || text.includes('vc') || text.includes('pincus') || text.includes('harbourvest') || text.includes('credit')) return 'Private Equity / Investing';
  if (text.includes('army') || text.includes('navy') || text.includes('military')) return 'Military / Government';
  if (text.includes('microsoft') || text.includes('tech') || text.includes('developer') || text.includes('product')) return 'Technology / Product';
  if (text.includes('health')) return 'Healthcare';
  if (text.includes('energy')) return 'Energy / Climate';
  if (text.includes('start') || text.includes('found')) return 'Startups & Founder';
  return 'Corporate Strategy';
}

export const SECTION_F_COHORT: Profile[] = seedCardsJson.map((item: any, index: number) => {
  const safeUid = item.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { building, type } = parseHousing(item.housing);
  const country = item.homeCountry || 'United States';
  const cCode = COUNTRY_CODE_MAP[country] || 'US';

  return {
    uid: safeUid,
    fullName: item.fullName,
    nickname: item.nickname || undefined,
    pronunciation: item.pronunciation || undefined,
    email: item.hbsEmail || item.personalEmail || `${safeUid}@mba2028.hbs.edu`,
    phone: item.phone || undefined,
    whatsapp: item.whatsapp || item.phone || undefined,
    notOnWhatsApp: false,
    birthday: item.birthday || undefined,
    photoUrl: item.photoUrl || '',
    homeCountry: country,
    countryCode: cCode,
    hometown: item.hometown || 'Boston, MA',
    housingType: type,
    housingBuilding: building,
    housingDetail: item.housing || 'Off-campus',
    preHbsCompany: item.preHbsCompany || 'Strategy & Operations',
    preHbsRole: item.preHbsRole || 'Consultant / Operator',
    preHbsIndustry: inferIndustry(item.preHbsCompany, item.preHbsRole),
    companyUrl: item.companyUrl || undefined,
    undergradSchool: item.undergrad || 'University Graduate',
    hasGraduateDegree: Boolean(item.dualDegree),
    graduateSchool: item.dualDegree ? item.dualDegree : undefined,
    graduateDegree: item.dualDegree ? item.dualDegree : undefined,
    postHbsExploration: Array.isArray(item.exploringInterests) && item.exploringInterests.length > 0 
      ? item.exploringInterests 
      : ['Entrepreneurship', 'Consulting', 'Investing'],
    languages: ['English'],
    countriesLived: country,
    funFact: (item.funFact && item.funFact.trim()) ? item.funFact.trim() : undefined,
    hobbies: item.hobbies || 'Fitness, travel, food',
    venmoHandle: item.venmo || undefined,
    zelleInfo: item.zelle || undefined,
    hasPartner: Boolean(item.partnerName),
    partner: item.partnerName ? {
      name: item.partnerName,
      affiliation: item.partnerAffiliation || undefined
    } : undefined,
    privacyLevel: 'share_all',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    isSample: true,
  };
});

// Deterministic daily spotlight selector based on day of year
export function getDailySpotlightProfile(profiles: Profile[], date: Date = new Date()): Profile {
  if (!profiles || profiles.length === 0) {
    return SECTION_F_COHORT[0];
  }
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const index = Math.abs(dayOfYear) % profiles.length;
  return profiles[index] || profiles[0];
}


