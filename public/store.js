// RSVP storage.
//
// With a backend: set window.BRAWL_API (e.g. "/api") before app.js loads. The site then calls
//   GET  {API}/rsvps          -> { count }
//   POST {API}/rsvps/lookup   { email } -> { rsvp: { name, role, hasCar, position, createdAt } | null }
//   POST {API}/rsvps          { name, email, role, hasCar } -> { count, position, updated }
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
  if (SEED !== null) return clamp(SEED + Object.keys(readJSON(DEMO_RSVPS_KEY) || {}).length);
  return clamp(readJSON(DEMO_COUNT_KEY) ?? 0);
}
function demoRsvps() {
  const rsvps = readJSON(DEMO_RSVPS_KEY) || {};
  if (SEED !== null && SEED >= 2) rsvps['player2@email.com'] ??= SAMPLE_GUEST;
  return rsvps;
}

export class FullError extends Error {}
export class ClosedError extends Error {}

export async function fetchCount() {
  if (!API) return demoCount();
  try {
    const res = await fetch(`${API}/rsvps`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(res.statusText);
    return clamp((await res.json()).count);
  } catch {
    // Offline (PWA) or server down: fall back to the guest's last known count.
    return readJSON(GUEST_KEY)?.lastCount ?? 0;
  }
}

// Returns the saved RSVP for this email, or null. The email goes in the request body, never the URL.
export async function lookupRsvp(email) {
  if (!API) return demoRsvps()[normalize(email)] ?? null;
  try {
    const res = await fetch(`${API}/rsvps/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email: normalize(email) }),
    });
    if (!res.ok) return null;
    return (await res.json()).rsvp ?? null;
  } catch {
    return null; // the note is a nicety; the server upserts by email either way
  }
}

export async function submitRsvp({ name, email, role, hasCar, website = '' }) {
  let count, position, updated;
  if (API) {
    const res = await fetch(`${API}/rsvps`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ name, email, role, hasCar, website }),
    });
    if (res.status === 409) {
      const { error } = await res.json().catch(() => ({}));
      throw error === 'closed' ? new ClosedError() : new FullError();
    }
    if (!res.ok) throw new Error(res.statusText);
    ({ count, position, updated } = await res.json());
  } else {
    const key = normalize(email);
    const rsvps = demoRsvps();
    const existing = rsvps[key];
    const current = demoCount();
    if (!existing && current >= CAP) throw new FullError();
    updated = !!existing;
    count = updated ? current : current + 1;
    position = updated ? existing.position : count;
    rsvps[key] = {
      name, role, hasCar, position,
      createdAt: existing?.createdAt ?? new Date().toLocaleDateString('en-CA'),
    };
    writeJSON(DEMO_RSVPS_KEY, rsvps);
    if (SEED === null) writeJSON(DEMO_COUNT_KEY, count);
  }
  // Email stays out of the guest record: the card only needs what it shows.
  const guest = { name, role, hasCar, position, lastCount: count };
  writeJSON(GUEST_KEY, guest);
  return { ...guest, updated };
}

export function getGuest() { return readJSON(GUEST_KEY); }

export function rememberCount(count) {
  const guest = getGuest();
  if (guest) writeJSON(GUEST_KEY, { ...guest, lastCount: count });
}

export function getHiScore() { return Number(readJSON(HI_KEY)) || 0; }
export function setHiScore(n) { writeJSON(HI_KEY, n); }
