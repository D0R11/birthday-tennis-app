// RSVP storage.
//
// With a backend: set window.BRAWL_API (e.g. "/api") before app.js loads. The site then calls
//   GET  {API}/rsvps          -> { count }
//   POST {API}/rsvps/lookup   { email } -> { rsvp: { createdAt } | null }   (never anyone's answers)
//   POST {API}/rsvps          { name, email, role, hasCar } -> { count, position, updated, changed }
//   POST {API}/rsvps/decline  { name, email } -> { count, wasIn }   ("can't make it")
//                             Upserts by email: a repeat email updates its entry and keeps its spot.
//                             409 { error: 'full' } (new emails only) or { error: 'closed' } after the deadline.
//
// Without one, it runs in local demo mode: RSVPs live in this browser only.
// Preview params: ?seed=N sets the count (?seed=20 shows BRAWL IS FULL) and adds a sample
// guest, player2@email.com, so the "Already on the list" note can be tried.

export const CAP = 20;

const API = window.BRAWL_API || null;
const GUEST_KEY = 'brawl.guest';
const DEMO_COUNT_KEY = 'brawl.demoCount';
const DEMO_RSVPS_KEY = 'brawl.demoRsvps';
const HI_KEY = 'brawl.hiScore';

const params = new URLSearchParams(location.search);
const SEED = params.has('seed') && !Number.isNaN(Number(params.get('seed'))) ? Number(params.get('seed')) : null;
const SAMPLE_GUEST = { name: 'Player 2', role: 'playing', hasCar: true, position: 2, createdAt: '2026-10-02' };

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: keep going */ }
}

const clamp = (n) => Math.min(CAP, Math.max(0, Math.round(n)));
const normalize = (email) => email.trim().toLowerCase();

function demoCount() {
  if (SEED !== null) return clamp(SEED + Object.values(readJSON(DEMO_RSVPS_KEY) || {}).filter((r) => r.status !== 'declined').length);
  return clamp(readJSON(DEMO_COUNT_KEY) ?? 0);
}
function demoRsvps() {
  const rsvps = readJSON(DEMO_RSVPS_KEY) || {};
  if (SEED !== null && SEED >= 2) rsvps['player2@email.com'] ??= SAMPLE_GUEST;
  return rsvps;
}

export class FullError extends Error {}
export class ClosedError extends Error {}
export class RateLimitError extends Error {}
export class InvalidError extends Error {}

// Give up on a slow connection instead of spinning forever.
const timeout = (ms) => (AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

export async function fetchCount() {
  if (!API) return demoCount();
  try {
    const res = await fetch(`${API}/rsvps`, { headers: { accept: 'application/json' }, signal: timeout(8000) });
    if (!res.ok) throw new Error(res.statusText);
    return clamp((await res.json()).count);
  } catch {
    // Offline (PWA) or server down: the guest's last known count, or null (shown as "--", never a false 0).
    return readJSON(GUEST_KEY)?.lastCount ?? null;
  }
}

// Returns the saved RSVP for this email, or null. The email goes in the request body, never the URL.
export async function lookupRsvp(email) {
  if (!API) {
    const found = demoRsvps()[normalize(email)];
    return found && found.status !== 'declined' ? { createdAt: found.createdAt } : null;
  }
  try {
    const res = await fetch(`${API}/rsvps/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email: normalize(email) }),
      signal: timeout(8000),
    });
    if (!res.ok) return null;
    const { rsvp } = await res.json();
    return rsvp ? { createdAt: rsvp.createdAt } : null;
  } catch {
    return null; // the note is a nicety; the server upserts by email either way
  }
}

async function post(path, body, ms) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal: timeout(ms),
  });
  if (res.status === 409) {
    const { error } = await res.json().catch(() => ({}));
    throw error === 'closed' ? new ClosedError() : new FullError();
  }
  if (res.status === 429) throw new RateLimitError();
  if (res.status === 400) throw new InvalidError();
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function submitRsvp({ name, email, role, hasCar, website = '' }) {
  let count, position, updated;
  if (API) {
    ({ count, position, updated } = await post('/rsvps', { name, email, role, hasCar, website }, 15000));
  } else {
    const key = normalize(email);
    const rsvps = demoRsvps();
    const existing = rsvps[key]?.status === 'declined' ? null : rsvps[key];
    const current = demoCount();
    if (!existing && current >= CAP) throw new FullError();
    updated = !!existing;
    count = updated ? current : current + 1;
    position = updated ? existing.position : count;
    rsvps[key] = {
      name, role, hasCar, position, status: 'in',
      createdAt: existing?.createdAt ?? new Date().toLocaleDateString('en-CA'),
    };
    writeJSON(DEMO_RSVPS_KEY, rsvps);
    if (SEED === null) writeJSON(DEMO_COUNT_KEY, count);
  }
  // The guest's own record on their own device, so they can reopen and edit their card.
  const guest = { name, email, role, hasCar, position, status: 'in', lastCount: count };
  writeJSON(GUEST_KEY, guest);
  return { ...guest, updated };
}

/** "Can't make it": frees the spot for this email, or records a no. Returns { count, wasIn }. */
export async function declineRsvp({ name, email, website = '' }) {
  let result;
  if (API) {
    result = await post('/rsvps/decline', { name, email, website }, 15000);
  } else {
    const key = normalize(email);
    const rsvps = demoRsvps();
    const wasIn = !!rsvps[key] && rsvps[key].status !== 'declined';
    rsvps[key] = { ...(rsvps[key] || { name, createdAt: new Date().toLocaleDateString('en-CA') }), status: 'declined', position: null };
    writeJSON(DEMO_RSVPS_KEY, rsvps);
    const count = clamp(demoCount() - (wasIn && SEED === null ? 1 : 0));
    if (SEED === null) writeJSON(DEMO_COUNT_KEY, count);
    result = { count: SEED === null ? count : demoCount(), wasIn };
  }
  const mine = getGuest();
  const keepName = mine && normalize(mine.email || '') === normalize(email) ? mine.name : name;
  writeJSON(GUEST_KEY, { name: keepName, email, status: 'declined', position: null, wasIn: result.wasIn, lastCount: result.count });
  return result;
}

export function getGuest() { return readJSON(GUEST_KEY); }

export function rememberCount(count) {
  const guest = getGuest();
  if (guest) writeJSON(GUEST_KEY, { ...guest, lastCount: count });
}

export function getHiScore() { return Number(readJSON(HI_KEY)) || 0; }
export function setHiScore(n) { writeJSON(HI_KEY, n); }
