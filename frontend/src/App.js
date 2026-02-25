import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  TreePine, Mountain, Tent, Compass, Bell, CalendarDays,
  Car, Video, Route, MapPin, ArrowLeft, Search, X,
  ChevronRight, Check, Mail, Droplets, Flame, Wifi,
  ShowerHead, Zap, Accessibility, Phone, Clock, Sparkles,
  MessageSquare, ExternalLink,
} from 'lucide-react';
import ALL_PARKS from './data/parks.json';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

// ─── Config ───────────────────────────────────────────────────────────────────

const POPULAR_PARKS = [
  { name: 'Yellowstone',    fullName: 'Yellowstone National Park',       state: 'WY' },
  { name: 'Yosemite',       fullName: 'Yosemite National Park',          state: 'CA' },
  { name: 'Grand Canyon',   fullName: 'Grand Canyon National Park',      state: 'AZ' },
  { name: 'Zion',           fullName: 'Zion National Park',              state: 'UT' },
  { name: 'Acadia',         fullName: 'Acadia National Park',            state: 'ME' },
  { name: 'Glacier',        fullName: 'Glacier National Park',           state: 'MT' },
  { name: 'Arches',         fullName: 'Arches National Park',            state: 'UT' },
  { name: 'Olympic',        fullName: 'Olympic National Park',           state: 'WA' },
  { name: 'Rocky Mountain', fullName: 'Rocky Mountain National Park',    state: 'CO' },
  { name: 'Joshua Tree',    fullName: 'Joshua Tree National Park',       state: 'CA' },
];

const US_STATES = [
  'AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID',
  'IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC',
  'ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD',
  'TN','TX','UT','VA','VT','WA','WI','WV','WY',
];

const CATEGORIES = [
  { id: 'essentials',      label: 'Essentials',       icon: Mountain,     desc: 'Overview, hours & entry fees'      },
  { id: 'campgrounds',     label: 'Campgrounds',       icon: Tent,         desc: 'Sites, amenities & reservations'   },
  { id: 'things_to_do',   label: 'Things To Do',      icon: Compass,      desc: 'Hikes, activities & attractions'   },
  { id: 'alerts',          label: 'Alerts',            icon: Bell,         desc: 'Current closures & warnings'       },
  { id: 'events',          label: 'Events',            icon: CalendarDays, desc: 'Upcoming park events'              },
  { id: 'visitor_centers', label: 'Visitor Centers',   icon: MapPin,       desc: 'Hours, contact & directions'      },
  { id: 'road_conditions', label: 'Road Conditions',   icon: Car,          desc: 'Closures & active road work'       },
  { id: 'webcams',         label: 'Live Webcams',      icon: Video,        desc: 'Streaming camera feeds'            },
];

// ─── Background slideshow ─────────────────────────────────────────────────────

function BackgroundSlideshow({ images, onParkChange }) {
  const topRef    = useRef(1 % images.length);
  const [bottomIdx, setBottomIdx] = useState(0);
  const [topIdx,    setTopIdx]    = useState(1 % images.length);
  const [topVisible, setTopVisible] = useState(false);

  useEffect(() => {
    if (images.length < 2) return;
    onParkChange?.(images[0].name);

    const timer = setInterval(() => {
      // Announce the incoming image's park name
      onParkChange?.(images[topRef.current].name);
      setTopVisible(true);

      setTimeout(() => {
        const newBottom = topRef.current;
        const newTop    = (topRef.current + 1) % images.length;
        topRef.current  = newTop;
        setBottomIdx(newBottom);
        setTopIdx(newTop);
        setTopVisible(false);
      }, 1200);
    }, 8000);

    return () => clearInterval(timer);
  }, [images, onParkChange]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src={images[bottomIdx].url}
        alt={images[bottomIdx].altText || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <img
        src={images[topIdx].url}
        alt={images[topIdx].altText || ''}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${topVisible ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

// ─── Newsletter signup (home screen) ─────────────────────────────────────────

function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Mail size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">Weekly park picks</p>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">
            A new park, trail, or hidden gem in your inbox every week. No spam.
          </p>
          {done ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <Check size={12} /> You&apos;re subscribed
            </p>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (email.trim()) setDone(true); }} className="flex gap-2">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 min-w-0 text-xs px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 outline-none focus:border-emerald-400 placeholder-stone-400"
              />
              <button type="submit" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors flex-shrink-0">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Permit alert signup (campgrounds results) ────────────────────────────────

function PermitAlertsCard() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">Get permit drop alerts</p>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">
            Half Dome, Whitney, Havasupai — be first when spots open.
          </p>
          {done ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <Check size={12} /> You&apos;re on the list
            </p>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (email.trim()) setDone(true); }} className="flex gap-2">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 min-w-0 text-xs px-3 py-2 rounded-lg border border-emerald-200 bg-white outline-none focus:border-emerald-400 placeholder-stone-400"
              />
              <button type="submit" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors flex-shrink-0">
                <Bell size={11} /> Notify me
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Result renderers ─────────────────────────────────────────────────────────

// Splits a string on URLs and renders them as "View →" links
function renderWithLinks(str) {
  const parts = str.split(/(https?:\/\/[^\s]+)/g);
  if (parts.length === 1) return str;
  return parts.map((part, i) =>
    part.startsWith('http')
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors whitespace-nowrap">
          View →
        </a>
      : part
  );
}

function ResultText({ text }) {
  if (!text) return null;
  return (
    <div className="space-y-1.5 text-sm text-stone-700 leading-relaxed">
      {text.split('\n').filter(l => l.trim()).map((line, i) => {
        const t = line.trim();
        if (t.startsWith('•') || t.startsWith('-'))
          return (
            <div key={i} className="flex gap-2">
              <span className="text-emerald-600 flex-shrink-0 mt-0.5">•</span>
              <span>{renderWithLinks(t.replace(/^[•\-]\s*/, ''))}</span>
            </div>
          );
        if (t.startsWith('===') && t.endsWith('==='))
          return <p key={i} className="text-xs font-semibold uppercase tracking-wider text-stone-400 pt-3 pb-1">{t.replace(/===/g, '').trim()}</p>;
        if (t.match(/^Day \d+/i))
          return <p key={i} className="font-semibold text-stone-800 pt-2">{t}</p>;
        return <p key={i}>{renderWithLinks(t)}</p>;
      })}
    </div>
  );
}

function EssentialsResult({ data }) {
  if (!data) return <p className="text-sm text-stone-500">No data available.</p>;
  return (
    <div className="space-y-5">
      {data.description && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">About</p>
          <p className="text-sm text-stone-700 leading-relaxed">{data.description}</p>
        </div>
      )}
      {data.operatingHours?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Hours</p>
          {data.operatingHours.map((h, i) => (
            <div key={i} className="mb-2">
              {h.name && <p className="text-sm font-medium text-stone-700">{h.name}</p>}
              <p className="text-sm text-stone-600">{h.description}</p>
            </div>
          ))}
        </div>
      )}
      {data.entranceFees?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Entry Fees</p>
          <div className="space-y-2">
            {data.entranceFees.map((f, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-stone-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-stone-700">{f.title}</p>
                  {f.description && <p className="text-xs text-stone-500 mt-0.5">{f.description}</p>}
                </div>
                <span className="text-sm font-semibold text-emerald-700 flex-shrink-0">${f.cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.entrancePasses?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Passes</p>
          <div className="space-y-2">
            {data.entrancePasses.map((p, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-stone-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-stone-700">{p.title}</p>
                  {p.description && <p className="text-xs text-stone-500 mt-0.5">{p.description}</p>}
                </div>
                <span className="text-sm font-semibold text-emerald-700 flex-shrink-0">${p.cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.weatherInfo && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Weather</p>
          <p className="text-sm text-stone-600">{data.weatherInfo}</p>
        </div>
      )}
      {data.directionsInfo && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Getting There</p>
          <p className="text-sm text-stone-600">{data.directionsInfo}</p>
        </div>
      )}
    </div>
  );
}

function AmenityBadge({ icon: Icon, label, active }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
      <Icon size={11} /> {label}
    </span>
  );
}

function CampgroundCards({ data, parkName }) {
  if (!data || data.length === 0)
    return (
      <div>
        <p className="text-sm text-stone-500 mb-4">
          No campground data found for {parkName}. Check{' '}
          <a href="https://www.recreation.gov" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
            Recreation.gov
          </a>{' '}
          for reservations.
        </p>
        <PermitAlertsCard />
      </div>
    );

  return (
    <div className="space-y-4">
      <PermitAlertsCard />
      {data.map((c, i) => {
        const sites = c.campsites || {};
        const amenities = c.amenities || {};
        const access = c.accessibility || {};
        return (
          <div key={i} className="border border-stone-200 rounded-xl p-4 bg-white">
            <p className="font-semibold text-stone-800 mb-1">{c.name}</p>
            {c.description && <p className="text-xs text-stone-500 mb-3 leading-relaxed">{c.description}</p>}
            {sites.totalsites && (
              <div className="flex flex-wrap gap-3 mb-3 text-xs text-stone-600">
                <span><span className="font-semibold text-stone-800">{sites.totalsites}</span> total sites</span>
                {sites.tentonly > '0' && <span><span className="font-semibold">{sites.tentonly}</span> tent-only</span>}
                {sites.rvonly > '0' && <span><span className="font-semibold">{sites.rvonly}</span> RV-only</span>}
                {sites.electricalhookups > '0' && <span><span className="font-semibold">{sites.electricalhookups}</span> electric hookup</span>}
                {sites.group > '0' && <span><span className="font-semibold">{sites.group}</span> group</span>}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <AmenityBadge icon={Droplets}      label="Potable Water"  active={amenities.potablewater?.some(v => v && v !== 'No water')} />
              <AmenityBadge icon={ShowerHead}    label="Showers"        active={amenities.showers?.some(v => v && !v.toLowerCase().includes('none'))} />
              <AmenityBadge icon={Flame}         label="Firewood"       active={amenities.firewoodforsale === 'Yes'} />
              <AmenityBadge icon={Zap}           label="Electric"       active={(sites.electricalhookups || '0') > '0'} />
              <AmenityBadge icon={Wifi}          label="Cell Service"   active={access.cellphoneinfo && !access.cellphoneinfo.toLowerCase().includes('no service')} />
              <AmenityBadge icon={Accessibility} label="Accessible"     active={access.wheelchairaccess && access.wheelchairaccess.length > 2} />
            </div>
            {c.reservationInfo && (
              <p className="text-xs text-stone-500 border-t border-stone-100 pt-2 mt-2">
                <span className="font-medium text-stone-600">Reservations: </span>{c.reservationInfo}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VisitorCenterCards({ data, parkName }) {
  if (!data || data.length === 0)
    return <p className="text-sm text-stone-500">No visitor center data found for {parkName}.</p>;

  return (
    <div className="space-y-4">
      {data.map((vc, i) => {
        const phone = vc.contacts?.phoneNumbers?.[0];
        const addr  = vc.addresses?.find(a => a.type === 'Physical') || vc.addresses?.[0];
        const hours = vc.operatingHours?.[0];
        return (
          <div key={i} className="border border-stone-200 rounded-xl p-4 bg-white">
            <p className="font-semibold text-stone-800 mb-1">{vc.name}</p>
            {vc.description && <p className="text-xs text-stone-500 mb-3 leading-relaxed">{vc.description}</p>}
            <div className="space-y-1.5">
              {hours && (
                <div className="flex items-start gap-2 text-xs text-stone-600">
                  <Clock size={12} className="text-stone-400 mt-0.5 flex-shrink-0" />
                  <span>{hours.description || 'See park website for hours'}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <Phone size={12} className="text-stone-400 flex-shrink-0" />
                  <span>{phone.phoneNumber}</span>
                </div>
              )}
              {addr && (
                <div className="flex items-start gap-2 text-xs text-stone-600">
                  <MapPin size={12} className="text-stone-400 mt-0.5 flex-shrink-0" />
                  <span>{[addr.line1, addr.city, addr.stateCode].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Trip plan modal ──────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function TripPlanModal({ parkName, onSubmit, onClose }) {
  const [days, setDays] = useState('3');
  const [month, setMonth] = useState('');
  const [people, setPeople] = useState('2');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 pb-8 sm:pb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-stone-800">Plan a Trip</p>
            <p className="text-xs text-stone-500 mt-0.5">{parkName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">How many days?</label>
            <div className="flex gap-2">
              {['1','2','3','4','5','7'].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${days === d ? 'bg-emerald-700 text-white border-emerald-700' : 'border-stone-200 text-stone-600 hover:border-emerald-300'}`}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Travel month (optional)</label>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-stone-200 outline-none focus:border-emerald-400 text-stone-700 bg-white">
              <option value="">Any time</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Group size</label>
            <div className="flex gap-2">
              {['1','2','3','4','5','6+'].map(p => (
                <button key={p} onClick={() => setPeople(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${people === p ? 'bg-emerald-700 text-white border-emerald-700' : 'border-stone-200 text-stone-600 hover:border-emerald-300'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => onSubmit({ durationDays: days, month, groupSize: people })}
          className="mt-6 w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
          <Sparkles size={15} /> Build my itinerary
        </button>
      </div>
    </div>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function HomeScreen({ onSelectPark }) {
  const [query, setQuery]             = useState('');
  const [stateFilter, setStateFilter] = useState(null);
  const [currentPark, setCurrentPark] = useState('');

  // Pull NPS images from bundled parks.json — no API call needed
  const heroImages = useMemo(() =>
    POPULAR_PARKS
      .map(p => ALL_PARKS.find(a => a.fullName === p.fullName))
      .filter(p => p?.image?.url)
      .map(p => ({ url: p.image.url, altText: p.image.altText, name: p.fullName })),
    []
  );

  const filtered = query.trim().length > 1
    ? ALL_PARKS.filter(p => p.fullName.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const stateParks = stateFilter
    ? ALL_PARKS.filter(p => p.states?.split(',').map(s => s.trim()).includes(stateFilter))
    : null;

  return (
    <div className="flex flex-col">

      {/* ── Rotating hero ── */}
      <div className="relative h-64 overflow-hidden">
        {heroImages.length > 0 && (
          <BackgroundSlideshow images={heroImages} onParkChange={setCurrentPark} />
        )}
        {/* Gradient darkens bottom so search bar reads cleanly */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/30 to-black/65 pointer-events-none" />

        {/* Title */}
        <div className="relative z-10 flex flex-col justify-end h-full px-5 pb-12">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg leading-tight">Every national park.<br />Everything you need.</h1>
          <p className="text-white/65 text-sm mt-2 leading-relaxed">Campgrounds, alerts, conditions &amp; AI trip plans — all 474 NPS parks.</p>
        </div>

        {/* Photo credit — bottom-right, subtle */}
        {currentPark && (
          <p className="absolute bottom-3 right-4 text-white/35 text-xs truncate max-w-[200px] pointer-events-none">
            {currentPark}
          </p>
        )}
      </div>

      {/* ── Search overlaps hero bottom ── */}
      <div className="relative -mt-6 z-10 px-4 max-w-xl mx-auto w-full">
        <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-3.5 shadow-xl focus-within:border-emerald-400 transition-all">
          <Search size={16} className="text-stone-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setStateFilter(null); }}
            placeholder="Search parks, e.g. Yosemite…"
            className="flex-1 text-sm text-stone-800 placeholder-stone-400 outline-none bg-transparent"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-stone-400 hover:text-stone-600 transition-colors">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {filtered.length > 0 && (
          <div className="absolute top-full left-4 right-4 mt-1.5 bg-white border border-stone-200 rounded-2xl shadow-xl z-20 overflow-hidden">
            {filtered.map(park => (
              <button
                key={park.parkCode}
                onClick={() => { onSelectPark(park); setQuery(''); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left border-b border-stone-100 last:border-0"
              >
                {park.image?.url
                  ? <img src={park.image.url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0"><Mountain size={14} className="text-stone-400" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 truncate">{park.fullName}</p>
                  {park.states && <p className="text-xs text-stone-400">{park.states}</p>}
                </div>
                <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
        {query.trim().length > 1 && filtered.length === 0 && (
          <div className="absolute top-full left-4 right-4 mt-1.5 bg-white border border-stone-200 rounded-2xl shadow-xl z-20">
            <p className="px-4 py-3 text-sm text-stone-500">No parks found for &ldquo;{query}&rdquo;</p>
          </div>
        )}
      </div>

      {/* ── Lower content ── */}
      <div className="flex flex-col items-center px-4 pt-5 pb-10 max-w-xl mx-auto w-full">

        {/* State filter */}
        <div className="w-full mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Browse by state</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {US_STATES.map(s => (
              <button
                key={s}
                onClick={() => { setStateFilter(stateFilter === s ? null : s); setQuery(''); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  stateFilter === s
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'border-stone-200 text-stone-600 bg-white hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Park list or photo grid */}
        <div className="w-full">
          {stateFilter ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
                Parks in {stateFilter} ({stateParks.length})
              </p>
              {stateParks.length === 0
                ? <p className="text-sm text-stone-500">No parks found in {stateFilter}.</p>
                : (
                  <div className="space-y-2">
                    {stateParks.map(p => (
                      <button
                        key={p.parkCode}
                        onClick={() => onSelectPark(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left group"
                      >
                        {p.image?.url
                          ? <img src={p.image.url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          : <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0"><Mountain size={16} className="text-stone-400" /></div>
                        }
                        <p className="flex-1 text-sm text-stone-700 group-hover:text-emerald-800 transition-colors">{p.fullName}</p>
                        <ChevronRight size={14} className="text-stone-300 group-hover:text-emerald-500 flex-shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                )
              }
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Popular parks</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {POPULAR_PARKS.map(p => {
                  const staticPark = ALL_PARKS.find(a => a.fullName === p.fullName);
                  const image = staticPark?.image;
                  return (
                    <button
                      key={p.fullName}
                      onClick={() => onSelectPark({ fullName: p.fullName, parkCode: staticPark?.parkCode, states: p.state })}
                      className="flex-shrink-0 relative w-36 h-52 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
                    >
                      {image?.url
                        ? <img src={image.url} alt={image.altText || p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full bg-stone-200 flex items-center justify-center"><Mountain size={28} className="text-stone-400" /></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-xs font-bold leading-tight">{p.name}</p>
                        <p className="text-white/60 text-xs mt-0.5">{p.state}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="w-full mt-6"><NewsletterSignup /></div>

        {/* ── About ── */}
        <div className="w-full mt-8 pt-8 border-t border-stone-200">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">About Park Guide</p>
          <p className="text-sm text-stone-600 leading-relaxed mb-3">
            Planning a national park trip shouldn't mean navigating a tangle of government websites and outdated PDFs.
            Park Guide pulls campground details, live alerts, road closures, events, webcam feeds, and visitor center hours
            directly from the National Park Service — and puts it all in one clean, fast interface.
          </p>
          <p className="text-sm text-stone-600 leading-relaxed mb-5">
            Our AI trip planner builds a personalized day-by-day itinerary so you can spend less time planning
            and more time outside. Whether you're a first-time visitor or a seasoned backcountry hiker,
            Park Guide is built to be your starting point for every adventure.
          </p>
          <p className="text-xs text-stone-400 leading-relaxed mb-4">
            Data sourced from the{' '}
            <a href="https://www.nps.gov/subjects/developer/index.htm" target="_blank" rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-800 transition-colors">
              National Park Service Open Data API
            </a>
            . Park Guide is an independent product, not affiliated with the NPS.
          </p>

          {/* Feedback */}
          <a
            href="mailto:jatt123wow@gmail.com?subject=Park%20Guide%20Feedback"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-colors group"
          >
            <MessageSquare size={14} className="text-stone-400 group-hover:text-emerald-600 transition-colors" />
            <span className="text-sm text-stone-600 group-hover:text-emerald-700 transition-colors">Share feedback</span>
            <ExternalLink size={12} className="text-stone-300 group-hover:text-emerald-500 transition-colors" />
          </a>
        </div>

      </div>
    </div>
  );
}

function ParkScreen({ park, parkHeader, headerLoading, onSelectCategory, onBack }) {
  const image = parkHeader?.image;
  return (
    <div className="flex flex-col max-w-xl mx-auto w-full pb-8">
      {/* Hero image — taller, more dramatic */}
      <div className="relative w-full h-72 bg-stone-200 overflow-hidden">
        {image?.url
          ? <img src={image.url} alt={image.altText || park.fullName} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Mountain size={48} className="text-stone-300" /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 hover:text-white text-sm bg-black/25 backdrop-blur-sm px-3 py-1.5 rounded-full transition-colors"
        >
          <ArrowLeft size={14} /> All parks
        </button>
        <div className="absolute bottom-5 left-5 right-5">
          <h2 className="text-white font-bold text-xl leading-snug drop-shadow-lg">{park.fullName}</h2>
          {parkHeader?.states && <p className="text-white/65 text-xs mt-1">{parkHeader.states}</p>}
        </div>
      </div>

      <div className="px-4 pt-5">
        {/* Park description */}
        {parkHeader?.description && !headerLoading && (
          <p className="text-sm text-stone-500 mb-5 leading-relaxed line-clamp-4">{parkHeader.description}</p>
        )}
        {headerLoading && <div className="h-12 bg-stone-100 rounded-xl animate-pulse mb-5" />}

        {/* Category grid — 3 columns, icon + label only */}
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">What do you need?</p>
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onSelectCategory(id)}
              className="flex flex-col items-center gap-2 px-2 py-4 rounded-2xl border border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                <Icon size={17} className="text-stone-500 group-hover:text-emerald-700 transition-colors" />
              </div>
              <p className="text-xs font-medium text-stone-700 group-hover:text-emerald-800 leading-tight transition-colors">{label}</p>
            </button>
          ))}
        </div>

        {/* Plan a Trip — featured full-width button */}
        <button
          onClick={() => onSelectCategory('trip_plan')}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles size={17} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Plan a Trip</p>
              <p className="text-xs text-white/65 mt-0.5">AI-generated day-by-day itinerary</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-white/60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

function ResultsScreen({ park, category, result, loading, error, onBack }) {
  const cat = CATEGORIES.find(c => c.id === category) || { id: 'trip_plan', label: 'Trip Plan', icon: Sparkles };
  const Icon = cat?.icon;

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-stone-400">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
        </div>
        <span className="text-sm">Fetching from NPS…</span>
      </div>
    );
    if (error) return <p className="text-sm text-red-500">{error}</p>;
    if (!result) return null;

    if (category === 'essentials')      return <EssentialsResult data={result.data} />;
    if (category === 'campgrounds')     return <CampgroundCards data={result.data} parkName={park.fullName} />;
    if (category === 'visitor_centers') return <VisitorCenterCards data={result.data} parkName={park.fullName} />;
    return <ResultText text={result.text} />;
  };

  return (
    <div className="flex flex-col max-w-xl mx-auto w-full px-4 pt-5 pb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-5 self-start"
      >
        <ArrowLeft size={15} /> {park.fullName}
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Icon size={19} className="text-emerald-700" />
        </div>
        <div>
          <p className="text-xs text-stone-500">{park.fullName}</p>
          <h2 className="text-lg font-bold text-stone-900">{cat?.label}</h2>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm min-h-[140px]">
        {renderContent()}
      </div>
    </div>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]               = useState('home');
  const [selectedPark, setSelectedPark]   = useState(null);
  const [parkHeader, setParkHeader]       = useState(null);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [result, setResult]               = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [showTripModal, setShowTripModal] = useState(false);

  const handleSelectPark = (park) => {
    const staticPark = ALL_PARKS.find(p => p.fullName === park.fullName) || park;
    setSelectedPark(staticPark);
    setSelectedCategory(null);
    setResult(null);
    setError(null);
    setParkHeader(staticPark.image ? { image: staticPark.image, states: staticPark.states } : null);
    setScreen('park');

    setHeaderLoading(true);
    fetch(`${API_BASE}/api/park-header`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parkName: staticPark.fullName }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setParkHeader(d.park); })
      .catch(() => {})
      .finally(() => setHeaderLoading(false));
  };

  const handleSelectCategory = (categoryId) => {
    if (categoryId === 'trip_plan') {
      setSelectedCategory(categoryId);
      setShowTripModal(true);
      return;
    }
    fetchCategory(categoryId);
  };

  const fetchCategory = async (categoryId, tripParams = {}) => {
    setSelectedCategory(categoryId);
    setResult(null);
    setError(null);
    setLoading(true);
    setScreen('results');

    try {
      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parkName: selectedPark.fullName, category: categoryId, tripParams }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load data');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-20">
        <button onClick={() => setScreen('home')} className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center">
            <TreePine size={16} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-stone-900 leading-none">Park Guide</p>
            <p className="text-xs text-stone-500 mt-0.5">474 National Parks</p>
          </div>
        </button>
        <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">Beta</span>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {screen === 'home' && <HomeScreen onSelectPark={handleSelectPark} />}
        {screen === 'park' && selectedPark && (
          <ParkScreen
            park={selectedPark}
            parkHeader={parkHeader}
            headerLoading={headerLoading}
            onSelectCategory={handleSelectCategory}
            onBack={() => setScreen('home')}
          />
        )}
        {screen === 'results' && selectedPark && (
          <ResultsScreen
            park={selectedPark}
            category={selectedCategory}
            result={result}
            loading={loading}
            error={error}
            onBack={() => setScreen('park')}
          />
        )}
      </div>

      {showTripModal && selectedPark && (
        <TripPlanModal
          parkName={selectedPark.fullName}
          onClose={() => setShowTripModal(false)}
          onSubmit={(tripParams) => {
            setShowTripModal(false);
            fetchCategory('trip_plan', tripParams);
          }}
        />
      )}
    </div>
  );
}
