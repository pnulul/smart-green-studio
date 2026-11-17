import approvedActions from '../config/usageActions.json';

type Screen = 'entry' | 'setup' | 'analysis' | 'ai_report' | 'ai_lab';
type LocationStatus = 'unshared' | 'shared' | 'denied' | 'unavailable';
type SharedLocation = { p: LocationStatus; x?: number; y?: number };
type UsageEvent = SharedLocation & { v: string; n: number; t: number; s: Screen; a: string };
type Preference = { enabled: boolean; location: LocationStatus; locating: boolean };
const endpoint = import.meta.env.VITE_USAGE_ENDPOINT || '';
export const usageAvailable = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
const queueKey = 'sgs_public_usage_queue_v1';
const preferenceKey = 'sgs_public_usage_disabled_v1';
const maxAge = 86400000;
const hasAction = (name: string) => Object.prototype.hasOwnProperty.call(approvedActions, name);
const screens = ['entry', 'setup', 'analysis', 'ai_report', 'ai_lab'];
const eventFields = new Set(['v', 'n', 't', 's', 'a', 'p', 'x', 'y']);

function preferenceEnabled() {
  try { return localStorage.getItem(preferenceKey) !== '1'; } catch { return true; }
}

function validSaved(e: UsageEvent, now: number) {
  return e && typeof e === 'object' && Object.keys(e).every(key => eventFields.has(key)) &&
    /^v[a-f0-9]{16}$/.test(e.v) && Number.isInteger(e.n) && e.n > 0 && e.n <= 1000000 &&
    Number.isSafeInteger(e.t) && Math.abs(now - e.t) < maxAge && screens.includes(e.s) && hasAction(e.a) &&
    (e.p === 'shared' ? Number.isInteger(e.x) && Math.abs(e.x!) <= 900 && Number.isInteger(e.y) && Math.abs(e.y!) <= 1800 :
      ['unshared','denied','unavailable'].includes(e.p) && e.x == null && e.y == null);
}
function loadQueue(): UsageEvent[] {
  try {
    const items = JSON.parse(sessionStorage.getItem(queueKey) || '[]');
    return Array.isArray(items) ? items.filter(e => validSaved(e, Date.now())).slice(-200) : [];
  } catch { return []; }
}

let queue: UsageEvent[] = [];
let initialized = false;
let currentScreen: Screen | null = null;
let visit = '';
let seq = 0;
let location: SharedLocation = { p: 'unshared' };
let locationRequest = 0;
let preference: Preference = { enabled: preferenceEnabled(), location: 'unshared', locating: false };
const listeners = new Set<() => void>();
export const getUsagePreference = () => preference;
export function subscribeUsage(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function updatePreference(next: Partial<Preference>) {
  preference = { ...preference, ...next };
  listeners.forEach(listener => listener());
}
function persist() {
  try {
    if (queue.length) sessionStorage.setItem(queueKey, JSON.stringify(queue));
    else sessionStorage.removeItem(queueKey);
  } catch { /* Storage can be disabled in private browsing. */ }
}
let delivering = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let retryIn = 2000;
function schedule(ms: number) {
  if (!timer && queue.length && preference.enabled) {
    timer = setTimeout(() => { timer = undefined; void flush(); }, ms);
  }
}
async function flush() {
  if (delivering || !queue.length || !preference.enabled || !usageAvailable) return;
  queue = queue.filter(e => validSaved(e, Date.now()));
  if (!queue.length) { persist(); return; }
  delivering = true;
  const batch = queue.slice(0, 20);
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 25000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST', body: JSON.stringify({ version: 1, events: batch }), credentials: 'omit',
      referrerPolicy: 'no-referrer', keepalive: true, signal: abort.signal,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    });
    if (!response.ok) throw new Error('Collector unavailable');
    const reply = await response.json();
    if (reply.ok !== true && reply.error !== 'invalid') throw new Error('Collector busy');
    const sent = new Set(batch.map(e => e.v + '-' + e.n));
    queue = queue.filter(e => !sent.has(e.v + '-' + e.n));
    persist();
    retryIn = 2000;
  } catch { retryIn = Math.min(retryIn * 2, 60000); }
  finally {
    clearTimeout(timeout);
    delivering = false;
    schedule(retryIn);
  }
}
function record(a: string) {
  if (!usageAvailable || !currentScreen || !preference.enabled || !visit || !hasAction(a)) return;
  queue.push({ v: visit, n: ++seq, t: Date.now(), s: currentScreen, a, ...location });
  queue = queue.slice(-200);
  persist();
  schedule(900);
}
function startVisit() {
  if (!currentScreen || !preference.enabled || visit) return;
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  visit = 'v' + Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
  seq = 0;
  record('visit');
}
function onClick(event: MouseEvent) {
  if (!event.isTrusted || !(event.target instanceof Element) || !currentScreen) return;
  const source = event.target;
  if (source.closest('[data-usage-private]')) return;
  const el = source.closest<HTMLElement>('[data-usage-action], button, a[href], summary, [role="button"], input[type="checkbox"], input[type="file"]');
  if (el) {
    if (el.matches('button[type="submit"]') && el.closest('form[data-usage-submit]')) return;
    const action = el.dataset.usageAction || el.id;
    if (hasAction(action)) record(action);
    else if (el.closest('.leaflet-marker-pane')) record('map-marker');
    else if (el.matches('a')) record('other-link');
    else if (el.matches('summary')) record('menu');
    else if (el.matches('input[type="checkbox"]')) record('checkbox');
    else if (el.closest('[role="dialog"]')) record('dialog-control');
    else record('other-button');
  } else if (source.closest('.leaflet-container')) record('map');
}

export function setUsageScreen(screen: string | null) {
  if (!usageAvailable) return;
  currentScreen = screen && screens.includes(screen) ? screen as Screen : null;
  if (!initialized) {
    initialized = true;
    queue = preference.enabled ? loadQueue() : [];
    persist();
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', event => {
      if (event.target instanceof HTMLFormElement && event.target.dataset.usageSubmit) record(event.target.dataset.usageSubmit);
    }, true);
    window.addEventListener('online', () => void flush());
    window.addEventListener('pagehide', () => void flush());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
  }
  startVisit();
}
export function setUsageEnabled(enabled: boolean) {
  if (!usageAvailable || preference.enabled === enabled) return;
  try { localStorage.setItem(preferenceKey, enabled ? '0' : '1'); } catch { /* In-memory choice still applies. */ }
  locationRequest++;
  location = { p: 'unshared' };
  visit = '';
  queue = [];
  persist();
  updatePreference({ enabled, location: 'unshared', locating: false });
  if (enabled) startVisit();
}
export function stopLocationSharing() {
  locationRequest++;
  location = { p: 'unshared' };
  updatePreference({ location: 'unshared', locating: false });
  record('location');
}
export function coarseLocation(lat: number, lon: number): SharedLocation {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { p: 'unavailable' };
  return { p: 'shared', x: Math.round(lat * 10), y: Math.round(lon * 10) };
}
export function requestLocationSharing() {
  if (!usageAvailable || !preference.enabled || preference.locating) return;
  const token = ++locationRequest;
  updatePreference({ locating: true });
  const finish = (result: SharedLocation) => {
    if (token !== locationRequest || !preference.enabled) return;
    location = result;
    updatePreference({ location: result.p, locating: false });
    record('location');
  };
  if (!navigator.geolocation) { finish({ p: 'unavailable' }); return; }
  navigator.geolocation.getCurrentPosition(
    position => finish(coarseLocation(position.coords.latitude, position.coords.longitude)),
    err => finish({ p: err.code === 1 ? 'denied' : 'unavailable' }),
    { enableHighAccuracy: false, maximumAge: 0, timeout: 12000 },
  );
}
