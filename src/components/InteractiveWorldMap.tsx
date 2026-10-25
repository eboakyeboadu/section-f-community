import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { 
  Globe, 
  MapPin, 
  Users, 
  ArrowRight, 
  X, 
  Maximize2, 
  Minimize2, 
  Layers,
  User
} from 'lucide-react';
import { Profile } from '../types';

interface InteractiveWorldMapProps {
  profiles: Profile[];
  selectedCountry: string | null;
  onSelectCountry: (country: string) => void;
  onSwitchToDeck: () => void;
  onOpenDetails?: (profile: Profile) => void;
  tabKey?: string;
  activeSubView?: string;
}

// Precise Lat/Lng coordinates for Section F hometowns and major global cities
const HOMETOWN_COORDINATES: Record<string, [number, number]> = {
  // Section F cohort hometowns
  'Concord, MA': [42.4604, -71.3489],
  'Concord': [42.4604, -71.3489],
  'Franklin, MI': [42.5234, -83.3072],
  'Franklin': [42.5234, -83.3072],
  'Melbourne': [-37.8136, 144.9631],
  'Muscat, Oman and Chennai': [13.0827, 80.2707],
  'Chennai': [13.0827, 80.2707],
  'Muscat': [23.5880, 58.3829],
  'Mexico City': [19.4326, -99.1332],
  'Cincinnati, OH': [39.1031, -84.5120],
  'Cincinnati': [39.1031, -84.5120],
  'Maryland': [39.0458, -76.6413],
  'Colorado Springs, CO': [38.8339, -104.8214],
  'Colorado Springs': [38.8339, -104.8214],
  'London': [51.5074, -0.1278],
  'London / Edinburgh': [51.5074, -0.1278],
  'Edinburgh': [55.9533, -3.1883],
  'Wilmington, DE': [39.7447, -75.5484],
  'Wilmington': [39.7447, -75.5484],
  'Santiago': [-33.4489, -70.6693],
  'Glenview, IL': [42.0698, -87.7878],
  'Glenview': [42.0698, -87.7878],
  'Beijing': [39.9042, 116.4074],
  'Evanston, IL': [42.0451, -87.6877],
  'Evanston': [42.0451, -87.6877],
  'Taipei': [25.0330, 121.5654],
  'Nashville, TN': [36.1627, -86.7816],
  'Nashville': [36.1627, -86.7816],
  'Tokyo': [35.6762, 139.6503],
  'São Paulo': [-23.5505, -46.6333],
  'Seoul': [37.5665, 126.9780],
  'Palo Alto / San Francisco Bay Area, Shanghai': [37.4419, -122.1430],
  'Palo Alto': [37.4419, -122.1430],
  'San Francisco Bay Area': [37.7749, -122.4194],
  'Dammam': [26.4207, 50.0888],
  'Riyadh': [24.7136, 46.6753],
  'Jeddah': [21.4858, 39.1925],
  'Auckland': [-36.8485, 174.7633],
  'Wellington': [-41.2865, 174.7762],
  'Christchurch': [-43.5321, 172.6362],
  'Wilmette, IL': [42.0723, -87.7228],
  'Wilmette': [42.0723, -87.7228],
  'New York, NY': [40.7128, -74.0060],
  'New York': [40.7128, -74.0060],
  'Newton, MA': [42.3370, -71.2092],
  'Newton': [42.3370, -71.2092],
  'Kashmir': [34.0837, 74.7973],
  'Srinagar': [34.0837, 74.7973],
  'Tel Aviv': [32.0853, 34.7818],
  'Jerusalem': [31.7683, 35.2137],
  'Haifa': [32.7940, 34.9896],
  'Rome': [41.9028, 12.4964],
  'Bangkok': [13.7563, 100.5018],
  'Chiang Mai': [18.7883, 98.9853],
  'Mumbai': [19.0760, 72.8777],

  // Additional major hubs
  'Lagos': [6.5244, 3.3792],
  'San Francisco, CA': [37.7749, -122.4194],
  'San Francisco': [37.7749, -122.4194],
  'Munich': [48.1351, 11.5820],
  'Annapolis, MD': [38.9784, -76.4922],
  'Annapolis': [38.9784, -76.4922],
  'Dubai': [25.2048, 55.2708],
  'Paris / Lyon': [48.8566, 2.3522],
  'Paris': [48.8566, 2.3522],
  'Lyon': [45.7640, 4.8357],
  'Toronto, ON': [43.6532, -79.3832],
  'Toronto': [43.6532, -79.3832],
  'Accra': [5.6037, -0.1870],
  'Milan': [45.4642, 9.1900],
  'Chicago, IL': [41.8781, -87.6298],
  'Chicago': [41.8781, -87.6298],
  'Kyoto': [35.0116, 135.7681],
  'Bengaluru / San Jose': [12.9716, 77.5946],
  'Bengaluru': [12.9716, 77.5946],
  'San Jose': [37.3382, -121.8863],
  'New Delhi': [28.6139, 77.2090],
  'Amsterdam': [52.3676, 4.9041],
  'Nairobi': [-1.2921, 36.8219],
  'Buenos Aires': [-34.6037, -58.3816],
  'Stockholm': [59.3293, 18.0686],
  'Madrid': [40.4168, -3.7038],
  'Beirut': [33.8938, 35.5018],
  'Brussels / Ghent': [50.8503, 4.3517],
  'Brussels': [50.8503, 4.3517],
  'Ghent': [51.0543, 3.7174],
  'Dublin': [53.3498, -6.2603],
  'Austin, TX': [30.2672, -97.7431],
  'Austin': [30.2672, -97.7431],
  'Boston, MA': [42.3601, -71.0589],
  'Boston': [42.3601, -71.0589],
  'Cambridge, MA': [42.3736, -71.1097],
  'Cambridge': [42.3736, -71.1097],
  'Sydney': [-33.8688, 151.2093],
  'Singapore': [1.3521, 103.8198],
  'Shanghai': [31.2304, 121.4737],
  'Johannesburg': [-26.2041, 28.0473],
};

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  // ISO-2 Codes
  SA: [24.7136, 46.6753], // Saudi Arabia (Riyadh / central)
  IL: [31.7683, 35.2137], // Israel (Jerusalem / Tel Aviv)
  NZ: [-41.2865, 174.7762], // New Zealand (Wellington / central)
  TH: [13.7563, 100.5018], // Thailand (Bangkok)
  US: [38.5000, -96.0000],
  GB: [53.5000, -2.5000],
  AU: [-25.2744, 133.7751],
  IN: [21.7679, 78.8718],
  MX: [23.6345, -102.5528],
  CL: [-35.6751, -71.5430],
  CN: [35.8617, 104.1954],
  TW: [23.6978, 120.9605],
  JP: [36.2048, 138.2529],
  BR: [-14.2350, -51.9253],
  KR: [35.9078, 127.7669],
  IT: [41.8719, 12.5674],
  DE: [51.1657, 10.4515],
  FR: [46.2276, 2.2137],
  ES: [40.4637, -3.7492],
  CA: [56.1304, -106.3468],
  NG: [9.0820, 8.6753],
  GH: [7.9465, -1.0232],
  KE: [-0.0236, 37.9062],
  ZA: [-30.5595, 22.9375],
  AE: [23.4241, 53.8478],
  LB: [33.8547, 35.8623],
  BE: [50.5039, 4.4699],
  NL: [52.1326, 5.2913],
  IE: [53.1424, -7.6921],
  SE: [60.1282, 18.6435],
  SG: [1.3521, 103.8198],
  EG: [26.8206, 30.8025],
  CH: [46.8182, 8.2275],
  AT: [47.5162, 14.5501],
  AR: [-38.4161, -63.6167],
  CO: [4.5709, -74.2973],
  PE: [-9.1900, -75.0152],
  ID: [-0.7893, 113.9213],
  PH: [12.8797, 121.7740],
  VN: [14.0583, 108.2772],
  PK: [30.3753, 69.3451],
  BD: [23.6850, 90.3563],
  TR: [38.9637, 35.2433],
  GR: [39.0742, 21.8243],
  PT: [39.3999, -8.2245],
  PL: [51.9194, 19.1451],
  NO: [60.4720, 8.4689],
  DK: [56.2639, 9.5018],
  FI: [61.9241, 25.7482],

  // Full Country Names (lowercase normalized)
  'saudi arabia': [24.7136, 46.6753],
  'israel': [31.7683, 35.2137],
  'new zealand': [-41.2865, 174.7762],
  'thailand': [13.7563, 100.5018],
  'united states': [38.5000, -96.0000],
  'usa': [38.5000, -96.0000],
  'united kingdom': [53.5000, -2.5000],
  'uk': [53.5000, -2.5000],
  'australia': [-25.2744, 133.7751],
  'india': [21.7679, 78.8718],
  'mexico': [23.6345, -102.5528],
  'chile': [-35.6751, -71.5430],
  'china': [35.8617, 104.1954],
  'taiwan': [23.6978, 120.9605],
  'japan': [36.2048, 138.2529],
  'brazil': [-14.2350, -51.9253],
  'south korea': [35.9078, 127.7669],
  'korea': [35.9078, 127.7669],
  'italy': [41.8719, 12.5674],
  'germany': [51.1657, 10.4515],
  'france': [46.2276, 2.2137],
  'spain': [40.4637, -3.7492],
  'canada': [56.1304, -106.3468],
  'nigeria': [9.0820, 8.6753],
  'ghana': [7.9465, -1.0232],
  'kenya': [-0.0236, 37.9062],
  'south africa': [-30.5595, 22.9375],
  'united arab emirates': [23.4241, 53.8478],
  'uae': [23.4241, 53.8478],
  'lebanon': [33.8547, 35.8623],
  'belgium': [50.5039, 4.4699],
  'netherlands': [52.1326, 5.2913],
  'ireland': [53.1424, -7.6921],
  'sweden': [60.1282, 18.6435],
  'singapore': [1.3521, 103.8198],
};

// Backward compatibility alias
const COUNTRY_FALLBACKS = COUNTRY_COORDINATES;

// Robust multi-tier coordinate resolver
export function resolveProfileCoordinates(p: Profile): [number, number] {
  // 1. Exact hometown match
  if (p.hometown && HOMETOWN_COORDINATES[p.hometown.trim()]) {
    return HOMETOWN_COORDINATES[p.hometown.trim()];
  }

  // 2. Hometown segmented match (split by '/', ',', '&', 'and')
  if (p.hometown) {
    const parts = p.hometown.split(/[/,&]| and /).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (HOMETOWN_COORDINATES[part]) {
        return HOMETOWN_COORDINATES[part];
      }
    }
    // Substring match
    for (const [city, coord] of Object.entries(HOMETOWN_COORDINATES)) {
      if (p.hometown.toLowerCase().includes(city.toLowerCase())) {
        return coord;
      }
    }
  }

  // 3. Fallback by Home Country Name
  if (p.homeCountry) {
    const cLower = p.homeCountry.trim().toLowerCase();
    if (COUNTRY_COORDINATES[cLower]) {
      return COUNTRY_COORDINATES[cLower];
    }
  }

  // 4. Fallback by Country Code (2-letter ISO)
  if (p.countryCode) {
    const cUpper = p.countryCode.trim().toUpperCase();
    if (COUNTRY_COORDINATES[cUpper]) {
      return COUNTRY_COORDINATES[cUpper];
    }
  }

  // 5. Default to Harvard Business School / Boston Campus (never Mali / [20, 0])
  return [42.3662, -71.1212];
}

export type MapStyle = 'light' | 'dark';

// Watermark-free, clean basemaps that require no API key or external credentials
const MAP_TILES: Record<MapStyle, { url: string; subdomains?: string[]; attribution: string; maxZoom: number }> = {
  light: {
    // Esri World Gray Canvas (light) - Ultra clean, neutral, crisp, zero watermarks
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
    maxZoom: 16,
  },
  dark: {
    // Esri World Dark Gray Canvas - Sleek, dark modern palette, zero watermarks
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
    maxZoom: 16,
  },
};


export const InteractiveWorldMap: React.FC<InteractiveWorldMapProps> = ({
  profiles,
  selectedCountry,
  onSelectCountry,
  onSwitchToDeck,
  onOpenDetails,
  tabKey,
  activeSubView,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const mapStyle: MapStyle = 'dark';
  const [selectedClassmate, setSelectedClassmate] = useState<Profile | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const expandedMapContainerRef = useRef<HTMLDivElement | null>(null);
  
  const mapInstanceRef = useRef<L.Map | null>(null);
  const expandedMapInstanceRef = useRef<L.Map | null>(null);

  const markersRef = useRef<L.Marker[]>([]);
  const expandedMarkersRef = useRef<L.Marker[]>([]);

  // Compute non-overlapping, deterministic coordinates with spiderfy offset rosette for classmates in the same city
  const profileLocations = useMemo(() => {
    // 1. Map each profile to its base coordinates using exhaustive resolution
    const baseList = profiles.map((p) => {
      const coords = resolveProfileCoordinates(p);
      return {
        profile: p,
        baseKey: `${coords[0].toFixed(2)},${coords[1].toFixed(2)}`,
        baseCoord: coords,
      };
    });

    // 2. Group by location key to separate overlapping classmates
    const groups: Record<string, typeof baseList> = {};
    baseList.forEach((item) => {
      if (!groups[item.baseKey]) groups[item.baseKey] = [];
      groups[item.baseKey].push(item);
    });

    // 3. Compute deterministic non-overlapping coordinates so every classmate is clearly visible and clickable
    const result: { profile: Profile; latLng: [number, number] }[] = [];

    Object.values(groups).forEach((group) => {
      if (group.length === 1) {
        result.push({
          profile: group[0].profile,
          latLng: group[0].baseCoord,
        });
      } else {
        const count = group.length;
        // Deterministic geometric ring (radius between 0.55° and 0.95° based on cohort cluster)
        const radius = 0.55 + Math.min(count * 0.08, 0.45);
        group.forEach((item, idx) => {
          const angle = (2 * Math.PI * idx) / count;
          // Apply aspect ratio correction for latitude
          const lat = item.baseCoord[0] + Math.sin(angle) * (radius * 0.75);
          const lng = item.baseCoord[1] + Math.cos(angle) * radius;
          result.push({
            profile: item.profile,
            latLng: [lat, lng],
          });
        });
      }
    });

    return result;
  }, [profiles]);

  // Create Custom HTML Pin Icon explicitly identifying the classmate
  const createMarkerIcon = (profile: Profile, isSelected: boolean) => {
    const photo = profile.photoUrl && profile.photoUrl.trim() !== '' ? profile.photoUrl : null;
    const initial = profile.fullName ? profile.fullName.charAt(0).toUpperCase() : '?';
    const borderColor = isSelected ? '#FFFFFF' : '#F59E0B';
    const ringClass = isSelected 
      ? 'ring-4 ring-[#F59E0B] scale-125 z-[1000] shadow-[0_0_20px_#F59E0B]' 
      : 'hover:scale-110 shadow-lg';

    const html = `
      <div class="relative group cursor-pointer transition-transform duration-200 ${ringClass}">
        <div class="w-9 h-9 rounded-full bg-[#171226] p-0.5 border-2 shadow-2xl flex items-center justify-center overflow-hidden" style="border-color: ${borderColor}; box-shadow: 0 4px 14px rgba(0,0,0,0.65);">
          ${
            photo
              ? `<img src="${photo}" alt="${profile.fullName}" referrerpolicy="no-referrer" class="w-full h-full rounded-full object-cover pointer-events-none" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-[11px] font-bold text-amber-300\\'>${initial}</span>';" />`
              : `<div class="w-full h-full rounded-full bg-[#2E244A] flex items-center justify-center text-[11px] font-bold text-amber-300 pointer-events-none">${initial}</div>`
          }
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 ${isSelected ? 'bg-white' : 'bg-[#F59E0B]'} rotate-45 border border-[#171226] pointer-events-none"></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-classmate-pin',
      iconSize: [36, 42],
      iconAnchor: [18, 42],
      popupAnchor: [0, -42],
    });
  };

  // Helper to cleanly switch basemap tiles on any Leaflet map instance
  const applyTileLayer = (map: L.Map | null, style: MapStyle) => {
    if (!map) return;

    // 1. Remove all existing tile layers from the map to prevent stacking or occluding
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // 2. Add the theme-matched basemap tile layer
    const cfg = MAP_TILES[style];
    const newLayer = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains || 'abc',
      attribution: cfg.attribution,
      keepBuffer: 6,
      updateWhenIdle: false,
      updateInterval: 50,
    });

    newLayer.addTo(map);
    return newLayer;
  };

  // Fit all classmates across the entire world into the current viewport
  const fitAllClassmates = (isExp = false) => {
    const targetMap = isExp ? expandedMapInstanceRef.current : mapInstanceRef.current;
    if (!targetMap) return;

    if (profileLocations.length > 0) {
      const bounds = L.latLngBounds(profileLocations.map((pl) => pl.latLng));
      targetMap.fitBounds(bounds.pad(0.08), {
        padding: isExp ? [24, 24] : [12, 12],
        maxZoom: 3.2,
        animate: true,
      });
    } else {
      targetMap.fitBounds(
        [
          [-52, -145],
          [68, 160],
        ],
        {
          padding: isExp ? [16, 16] : [8, 8],
          animate: true,
        }
      );
    }
  };

  // Initialize Embedded Map (Runs once on mount)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 1.8,
      minZoom: 1.7,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      bounceAtZoomLimits: true,
      inertia: true,
      inertiaDeceleration: 3000,
      zoomAnimation: true,
      fadeAnimation: true,
      worldCopyJump: true,
      maxBounds: [
        [-85, -Infinity],
        [85, Infinity]
      ],
      maxBoundsViscosity: 1.0,
    });

    mapInstanceRef.current = map;
    applyTileLayer(map, mapStyle);

    // Auto-fit entire world and all cohort pins cleanly into screen
    const timer = setTimeout(() => {
      map.invalidateSize();
      fitAllClassmates(false);
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Initialize Fullscreen Map on Mount (Kept alive in background for 0ms instant expand/contract!)
  useEffect(() => {
    if (!expandedMapContainerRef.current) return;
    if (expandedMapInstanceRef.current) return;

    const expMap = L.map(expandedMapContainerRef.current, {
      center: [20, 0],
      zoom: 1.8,
      minZoom: 1.5,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      bounceAtZoomLimits: true,
      inertia: true,
      inertiaDeceleration: 3000,
      zoomAnimation: true,
      fadeAnimation: true,
      worldCopyJump: true,
      maxBounds: [
        [-85, -Infinity],
        [85, Infinity]
      ],
      maxBoundsViscosity: 1.0,
    });

    expandedMapInstanceRef.current = expMap;
    applyTileLayer(expMap, mapStyle);

    return () => {
      expMap.remove();
      expandedMapInstanceRef.current = null;
    };
  }, []);

  // Instant Expand / Contract handler with size invalidation & coordinate sync
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isExpanded && expandedMapInstanceRef.current) {
      requestAnimationFrame(() => {
        expandedMapInstanceRef.current?.invalidateSize();
      });
      // Ensure Leaflet recalculates dimensions once CSS flex/grid animations complete
      timer = setTimeout(() => {
        if (expandedMapInstanceRef.current) {
          expandedMapInstanceRef.current.invalidateSize();
          fitAllClassmates(true);
        }
      }, 180);
    } else if (!isExpanded && mapInstanceRef.current) {
      requestAnimationFrame(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      timer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          fitAllClassmates(false);
        }
      }, 180);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isExpanded]);

  // Tab-change hook & mount invalidation with auto-fitting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        fitAllClassmates(false);
      }
      if (isExpanded && expandedMapInstanceRef.current) {
        expandedMapInstanceRef.current.invalidateSize();
        fitAllClassmates(true);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [tabKey, activeSubView]);

  // Update Tile Layers when mapStyle changes (100% clean, instant switch across both maps)
  useEffect(() => {
    if (mapInstanceRef.current) {
      applyTileLayer(mapInstanceRef.current, mapStyle);
    }
    if (expandedMapInstanceRef.current) {
      applyTileLayer(expandedMapInstanceRef.current, mapStyle);
    }
  }, [mapStyle]);

  const handleViewClassmateCard = (p: Profile) => {
    if (onOpenDetails) {
      onOpenDetails(p);
    } else {
      onSwitchToDeck();
    }
  };

  // Create Interactive Leaflet Popup HTML element with 1-tap View Card CTA
  const createPopupElement = (profile: Profile) => {
    const container = document.createElement('div');
    container.className = 'p-3 flex flex-col space-y-2 text-left select-none';

    const photoHtml = profile.photoUrl && profile.photoUrl.trim() !== ''
      ? `<img src="${profile.photoUrl}" alt="${profile.fullName}" class="w-10 h-10 rounded-xl object-cover border-2 border-[#F59E0B] shrink-0 shadow" />`
      : `<div class="w-10 h-10 rounded-xl bg-[#2E244A] flex items-center justify-center border-2 border-[#F59E0B] text-slate-300 font-bold text-sm shrink-0 shadow">${profile.fullName.charAt(0)}</div>`;

    const nicknameHtml = profile.nickname
      ? `<span class="text-[11px] text-[#F59E0B] font-semibold">"${profile.nickname}"</span>`
      : '';

    const hometown = profile.hometown ? `${profile.hometown}, ${profile.homeCountry}` : profile.homeCountry;
    const roleDesc = profile.preHbsRole ? `${profile.preHbsRole} (${profile.preHbsCompany})` : (profile.preHbsCompany || '');

    container.innerHTML = `
      <div class="flex items-center space-x-2.5">
        ${photoHtml}
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 truncate">
            <span class="text-xs font-bold text-white truncate leading-tight">${profile.fullName}</span>
            ${nicknameHtml}
          </div>
          <span class="text-[11px] text-amber-300 truncate block mt-0.5">📍 ${hometown}</span>
          ${roleDesc ? `<span class="text-[10px] text-slate-400 truncate block">${roleDesc}</span>` : ''}
        </div>
      </div>
      <button type="button" class="view-card-btn w-full mt-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#581C87] to-[#7E22CE] hover:from-[#6B21A8] hover:to-[#9333EA] text-white font-bold text-[11px] flex items-center justify-center space-x-1 border border-[#F59E0B]/40 shadow active:scale-95 transition-all cursor-pointer">
        <span>View Profile</span>
        <span class="ml-1">→</span>
      </button>
    `;

    const btn = container.querySelector('.view-card-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleViewClassmateCard(profile);
      });
    }

    return container;
  };

  // Render & Update Markers on Embedded Map with 100% exact profile binding & Leaflet Popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    profileLocations.forEach(({ profile, latLng }) => {
      const isSelected = selectedClassmate?.uid === profile.uid;
      const marker = L.marker(latLng, {
        icon: createMarkerIcon(profile, isSelected),
        title: profile.fullName,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      // Bind Native Leaflet Popup directly to the pin
      const popup = L.popup({
        className: 'custom-classmate-popup',
        maxWidth: 260,
        minWidth: 200,
        autoPanPadding: [20, 20],
      }).setContent(createPopupElement(profile));

      marker.bindPopup(popup);

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedClassmate(profile);
        handleViewClassmateCard(profile);
      });

      markersRef.current.push(marker);
    });
  }, [profileLocations, selectedClassmate]);

  // Render & Update Markers on Fullscreen Map with 100% exact profile binding & Leaflet Popups
  useEffect(() => {
    const expMap = expandedMapInstanceRef.current;
    if (!expMap) return;

    expandedMarkersRef.current.forEach((m) => m.remove());
    expandedMarkersRef.current = [];

    profileLocations.forEach(({ profile, latLng }) => {
      const isSelected = selectedClassmate?.uid === profile.uid;
      const marker = L.marker(latLng, {
        icon: createMarkerIcon(profile, isSelected),
        title: profile.fullName,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(expMap);

      // Bind Native Leaflet Popup directly to the pin
      const popup = L.popup({
        className: 'custom-classmate-popup',
        maxWidth: 260,
        minWidth: 200,
        autoPanPadding: [20, 20],
      }).setContent(createPopupElement(profile));

      marker.bindPopup(popup);

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedClassmate(profile);
        handleViewClassmateCard(profile);
      });

      expandedMarkersRef.current.push(marker);
    });
  }, [profileLocations, selectedClassmate]);

  // Outside filter fly-to (Only when selectedCountry changes externally from filters, without overriding selectedClassmate)
  useEffect(() => {
    if (!selectedCountry) return;
    const match = profileLocations.find((pl) => pl.profile.homeCountry === selectedCountry || pl.profile.countryCode === selectedCountry);
    const targetCoord = match ? match.latLng : (COUNTRY_COORDINATES[selectedCountry.toLowerCase()] || COUNTRY_COORDINATES[selectedCountry.toUpperCase()]);
    if (targetCoord && !selectedClassmate) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(targetCoord, 4.5, { duration: 0.8 });
      }
      if (expandedMapInstanceRef.current) {
        expandedMapInstanceRef.current.flyTo(targetCoord, 5.5, { duration: 0.8 });
      }
    }
  }, [selectedCountry, profileLocations, selectedClassmate]);

  const handleZoomIn = (isExp = false) => {
    const targetMap = isExp ? expandedMapInstanceRef.current : mapInstanceRef.current;
    if (targetMap) targetMap.zoomIn();
  };

  const handleZoomOut = (isExp = false) => {
    const targetMap = isExp ? expandedMapInstanceRef.current : mapInstanceRef.current;
    if (targetMap) targetMap.zoomOut();
  };

  const uniqueNations = useMemo(() => {
    return new Set(profiles.map((p) => p.homeCountry)).size;
  }, [profiles]);

  return (
    <>
      {/* EMBEDDED MAP CARD - Compact 1-Line Layout */}
      <div className="bg-[#171226] border border-[#2E244A] rounded-2xl p-3 shadow-xl space-y-2.5 relative overflow-hidden">
        
        {/* Clean 1-Row Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Globe className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <h3 className="text-xs font-bold text-white truncate">Section Global Map</h3>
            <span className="text-[10px] text-[#F59E0B] font-mono px-1.5 py-0.2 bg-[#0B0813] rounded border border-[#2E244A] shrink-0">
              {uniqueNations} Nations
            </span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => setIsExpanded(true)}
              className="py-1 px-2.5 rounded-lg bg-[#581C87] hover:bg-[#6B21A8] text-[#F59E0B] hover:text-white font-bold text-xs flex items-center space-x-1 border border-[#F59E0B]/40 shadow active:scale-95 transition-all cursor-pointer"
              title="Expand to Fullscreen Atlas"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Expand</span>
            </button>
          </div>
        </div>

        {/* Leaflet Map Viewport - Taller responsive height for full vertical & horizontal pan */}
        <div className="relative w-full h-[340px] sm:h-[390px] rounded-xl overflow-hidden border border-[#2E244A] shadow-inner bg-[#0B0813]">
          {/* Leaflet DOM container */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-full z-0 pointer-events-auto bg-[#0B0813]" 
          />

          {/* Floating Zoom Controls */}
          <div className="absolute top-2.5 right-2.5 z-20 flex flex-col space-y-0.5 bg-[#171226]/90 backdrop-blur-md p-1 rounded-lg border border-[#2E244A] shadow-md">
            <button
              onClick={() => handleZoomIn(false)}
              className="w-6 h-6 rounded text-slate-300 hover:text-white hover:bg-[#2E244A] flex items-center justify-center font-bold text-xs cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <div className="w-full border-t border-[#2E244A]" />
            <button
              onClick={() => handleZoomOut(false)}
              className="w-6 h-6 rounded text-slate-300 hover:text-white hover:bg-[#2E244A] flex items-center justify-center font-bold text-xs cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
          </div>
        </div>

        {/* Selected Classmate Dossier - 100% verified to match the clicked pin's person */}
        {selectedClassmate && (
          <div 
            onClick={() => handleViewClassmateCard(selectedClassmate)}
            className="bg-[#0B0813] p-2.5 rounded-xl border border-[#F59E0B]/50 shadow-lg flex items-center justify-between gap-2 animate-fadeIn cursor-pointer hover:border-[#F59E0B] transition-all"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              {selectedClassmate.photoUrl && selectedClassmate.photoUrl.trim() !== '' ? (
                <img
                  src={selectedClassmate.photoUrl}
                  alt={selectedClassmate.fullName}
                  className="w-9 h-9 rounded-xl object-cover border-2 border-[#F59E0B] shrink-0 shadow"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#2E244A]/60 flex items-center justify-center border-2 border-[#F59E0B] shrink-0 shadow">
                  <User className="w-5 h-5 text-slate-300" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-xs font-bold text-white truncate leading-tight">
                    {selectedClassmate.fullName}
                  </span>
                  {selectedClassmate.nickname && (
                    <span className="text-[10px] text-[#F59E0B] font-semibold">
                      "{selectedClassmate.nickname}"
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-amber-300 truncate block">
                  📍 {selectedClassmate.hometown}, {selectedClassmate.homeCountry}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  {selectedClassmate.preHbsRole} ({selectedClassmate.preHbsCompany})
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleViewClassmateCard(selectedClassmate)}
                className="py-1.5 px-2.5 rounded-lg bg-[#581C87] hover:bg-[#6B21A8] text-[#F59E0B] hover:text-white font-bold text-[11px] flex items-center space-x-1 border border-[#F59E0B]/40 transition-all cursor-pointer shadow active:scale-95"
                title={`Open ${selectedClassmate.fullName}'s Profile`}
              >
                <span>View Profile</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setSelectedClassmate(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FULLSCREEN EXPANDED MAP MODAL - Persistent DOM Mount (Zero re-download, zero white flash, 0ms instant toggle) */}
      <div 
        className={`fixed inset-0 z-[100] bg-[#0B0813] flex flex-col transition-all duration-200 ${
          isExpanded 
            ? 'opacity-100 pointer-events-auto visible' 
            : 'opacity-0 pointer-events-none invisible'
        }`}
      >
        {/* Top Bar - Clean 1-Row */}
        <div className="bg-[#171226]/95 backdrop-blur-xl border-b border-[#2E244A] px-4 py-2.5 pt-safe flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center space-x-2 min-w-0">
            <Globe className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <h2 className="text-sm font-bold text-white truncate">Section F Atlas</h2>
            <span className="text-[10px] font-bold text-[#F59E0B] bg-[#581C87] px-2 py-0.5 rounded-full border border-[#F59E0B]/30 shrink-0">
              {uniqueNations} Nations
            </span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => setIsExpanded(false)}
              className="py-1.5 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600/40 text-rose-200 font-bold text-xs flex items-center space-x-1 shadow active:scale-95 cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Fullscreen Map Viewport */}
        <div className="relative flex-1 w-full overflow-hidden bg-[#0B0813]">
          <div ref={expandedMapContainerRef} className="w-full h-full z-0 bg-[#0B0813]" />

          {/* Floating Zoom Controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col space-y-1 bg-[#171226]/90 backdrop-blur-xl p-1 rounded-xl border border-[#2E244A] shadow-xl">
            <button
              onClick={() => handleZoomIn(true)}
              className="w-8 h-8 rounded-lg text-white hover:bg-[#581C87] flex items-center justify-center font-bold text-sm cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => handleZoomOut(true)}
              className="w-8 h-8 rounded-lg text-white hover:bg-[#581C87] flex items-center justify-center font-bold text-sm cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
          </div>

          {/* Bottom Dossier in Fullscreen - 100% verified matching pin */}
          {selectedClassmate && (
            <div 
              onClick={() => {
                setIsExpanded(false);
                handleViewClassmateCard(selectedClassmate);
              }}
              className="absolute bottom-5 left-4 right-4 max-w-sm mx-auto z-20 bg-[#171226]/95 backdrop-blur-2xl p-3.5 rounded-2xl border border-[#F59E0B]/50 shadow-2xl flex items-center justify-between gap-2.5 animate-fadeIn cursor-pointer hover:border-[#F59E0B] transition-all"
            >
              <div className="flex items-center space-x-3 min-w-0">
                {selectedClassmate.photoUrl && selectedClassmate.photoUrl.trim() !== '' ? (
                  <img
                    src={selectedClassmate.photoUrl}
                    alt={selectedClassmate.fullName}
                    className="w-11 h-11 rounded-xl object-cover border-2 border-[#F59E0B] shrink-0 shadow-lg"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-[#2E244A]/60 flex items-center justify-center border-2 border-[#F59E0B] shrink-0 shadow-lg">
                    <User className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-xs font-bold text-white truncate leading-tight">
                      {selectedClassmate.fullName}
                    </span>
                    {selectedClassmate.nickname && (
                      <span className="text-[10px] text-[#F59E0B] font-semibold">
                        "{selectedClassmate.nickname}"
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-amber-300 truncate block">
                    📍 {selectedClassmate.hometown}, {selectedClassmate.homeCountry}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {selectedClassmate.preHbsRole} ({selectedClassmate.preHbsCompany})
                  </span>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    handleViewClassmateCard(selectedClassmate);
                  }}
                  className="py-1.5 px-3 rounded-lg bg-[#581C87] text-[#F59E0B] hover:text-white font-bold text-xs border border-[#F59E0B]/40 shadow cursor-pointer transition-all active:scale-95 flex items-center space-x-1"
                >
                  <span>View Card</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setSelectedClassmate(null)}
                  className="text-[10px] text-slate-400 hover:text-white text-center cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </>
  );
};

