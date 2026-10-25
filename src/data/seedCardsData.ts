import { UnclaimedCard } from '../types';
import seedCardsJson from '../../seed_cards.json';

export const DEFAULT_SEED_CARDS: UnclaimedCard[] = seedCardsJson.map((item: any) => {
  const safeId = item.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return {
    id: safeId,
    fullName: item.fullName,
    nickname: item.nickname || '',
    pronunciation: item.pronunciation || '',
    hometown: item.hometown || '',
    homeCountry: item.homeCountry || 'United States',
    housing: item.housing || '',
    preHbsCompany: item.preHbsCompany || '',
    preHbsRole: item.preHbsRole || '',
    companyUrl: item.companyUrl || '',
    exploringInterests: Array.isArray(item.exploringInterests) ? item.exploringInterests : [],
    hobbies: item.hobbies || '',
    funFact: item.funFact || '',
    venmo: item.venmo || '',
    zelle: item.zelle || '',
    email: item.hbsEmail || item.personalEmail || '',
    phone: item.phone || '',
    whatsapp: item.whatsapp || item.phone || '',
    notOnWhatsApp: false,
    birthday: item.birthday || '',
    claimed: false,
    claimedByUid: null,
  };
});

