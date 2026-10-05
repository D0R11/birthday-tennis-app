import { CAP, FullError, ClosedError, fetchCount, lookupRsvp, submitRsvp, getGuest, rememberCount, getHiScore, setHiScore } from './store.js';
import { createGame } from './game.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad2 = (n) => String(n).padStart(2, '0');

const narrowQuery = matchMedia('(max-width: 899px)');
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iP(hone|ad|od)/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const views = { start: $('#view-start'), confirmed: $('#view-confirmed') };
const rsvpBtn = $('#rsvp-btn');
const inBtn = $('#in-btn');
const modal = $('#rsvp-modal');
const form = $('#rsvp-form');
const nameInput = $('#rsvp-name');
const emailInput = $('#rsvp-email');
const errorLine = $('#rsvp-error');
const confirmBtn = $('#confirm-btn');

let count = 0;
let guest = getGuest();

/* ---------- RSVP deadline ---------- */

// Open until Oct 12, last call Oct 13–15, closed after Oct 15, by the venue's date (Batangas, GMT+8).
// Preview a state with ?deadline=open|last|closed.
const LAST_CALL_FROM = '2026-10-13';
const DEADLINE = '2026-10-15';
const DEADLINE_STATES = {
  open: { lines: ['RSVP BY', 'OCT 15'], text: 'RSVP by October 15' },
  last: { lines: ['LAST CALL', 'OCT 15'], text: 'Last call: RSVP by October 15' },
  closed: { lines: ['RSVPS', 'CLOSED'], text: 'RSVPs closed on October 15' },
};

function deadlineState() {
  const preview = new URLSearchParams(location.search).get('deadline');
  if (preview in DEADLINE_STATES) return preview;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  if (today > DEADLINE) return 'closed';
  return today >= LAST_CALL_FROM ? 'last' : 'open';
}
const isClosed = () => deadlineState() === 'closed';

function renderDeadline() {
  const state = deadlineState();
  const { lines, text } = DEADLINE_STATES[state];
  $('#deadline').dataset.state = state;
  $('#deadline-text').textContent = text;
  $$('#deadline text').forEach((el) => { el.textContent = lines[Number(el.dataset.line) - 1]; });
}

/* ---------- Views ---------- */

function show(view) {
  document.body.dataset.view = view;
  views.start.hidden = view !== 'start';
  views.confirmed.hidden = view !== 'confirmed';
  window.scrollTo(0, 0);
  if (view === 'confirmed') {
    renderCard();
    $('#confirmed-title').focus();
  } else {
    renderStartAction();
  }
}

/* ---------- Meter + CTA ---------- */

function renderCount() {
  $$('[data-count]').forEach((el) => { el.textContent = count; });
  $$('.meter__track').forEach((el) => el.setAttribute('aria-valuenow', count));
  $$('.meter__fill').forEach((el) => { el.style.width = `${(count / CAP) * 100}%`; });
  $('#spots-left').textContent = CAP - count;
  renderStartAction();
}

function renderStartAction() {
  const closed = isClosed();
  const full = count >= CAP;
  inBtn.hidden = !guest;
  rsvpBtn.hidden = !!guest;
  rsvpBtn.disabled = closed || full;
  if (closed) {
    rsvpBtn.innerHTML = '<span class="wide-only">RSVPS CLOSED</span><span class="narrow-only">CLOSED</span>';
  } else {
    rsvpBtn.textContent = full ? 'BRAWL IS FULL' : 'RSVP NOW';
  }
}

/* ---------- Mini-game ---------- */

const canvas = $('#court-canvas');
const startBtn = $('#start-btn');
const ralliesEl = $('#rallies');
const hiEl = $('#hi-score');
const startHint = $('#start-hint');
const gameStatus = $('#game-status');
hiEl.textContent = pad2(getHiScore());

const game = createGame({
  canvas,
  narrowQuery,
  onRally(n) { ralliesEl.textContent = pad2(n); },
  onOver(n) {
    const hi = getHiScore();
    if (n > hi) { setHiScore(n); hiEl.textContent = pad2(n); }
    endGame(n);
  },
});

function startGame() {
  ralliesEl.textContent = '00';
  gameStatus.textContent = '';
  startBtn.hidden = true;
  canvas.hidden = false;
  document.body.classList.add('is-playing');
  game.start();
}

function endGame(rallies) {
  game.stop();
  document.body.classList.remove('is-playing');
  canvas.hidden = true;
  startBtn.hidden = false;
  const word = rallies === 1 ? 'RALLY' : 'RALLIES';
  startHint.textContent = `RALLY OVER · ${pad2(rallies)} ${word}`;
  gameStatus.textContent = `Rally over. ${rallies} ${rallies === 1 ? 'rally' : 'rallies'}. Press start to play again.`;
  startBtn.focus({ preventScroll: true });
}

startBtn.addEventListener('click', startGame);

/* ---------- Modal ---------- */

function openModal() {
  if (count >= CAP || guest || isClosed()) return;
  if (game.running) { game.stop(); endGame(game.rallies); }
  errorLine.textContent = '';
  [nameInput, emailInput].forEach((el) => el.removeAttribute('aria-invalid'));
  setKnown(null);
  modal.showModal();
  nameInput.focus();
}

function closeModal() {
  modal.close();
}

modal.addEventListener('close', () => {
  if (!guest) rsvpBtn.focus();
});
$('#modal-close').addEventListener('click', closeModal);
rsvpBtn.addEventListener('click', openModal);

$$('.answers').forEach((group) => {
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.answer');
    if (!btn) return;
    $$('.answer', group).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});

const pick = (question, value) => {
  $$(`.answers[data-question="${question}"] .answer`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
};

/* ---------- "Already on the list" ---------- */

const emailNote = $('#rsvp-email-note');
const SUBMIT_LABEL = { add: 'CONFIRM RSVP', update: 'UPDATE RSVP' };
let known = null;
let lookupTimer = 0;
let lookupSeq = 0;

function formatDate(isoDate) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function setKnown(rsvp) {
  const wasKnown = !!known;
  known = rsvp;
  emailInput.classList.toggle('is-known', !!rsvp);
  emailNote.hidden = !rsvp;
  confirmBtn.textContent = rsvp ? SUBMIT_LABEL.update : SUBMIT_LABEL.add;
  if (rsvp && !wasKnown) {
    $('#rsvp-email-date').textContent = formatDate(rsvp.createdAt);
    // Prefill the saved answers; keep a name the guest already typed.
    if (!nameInput.value.trim()) nameInput.value = rsvp.name;
    pick('role', rsvp.role);
    pick('car', rsvp.hasCar ? 'yes' : 'no');
  }
}

async function checkEmail() {
  clearTimeout(lookupTimer);
  const email = emailInput.value.trim();
  const seq = ++lookupSeq;
  if (!validEmail(email)) { setKnown(null); return; }
  const rsvp = await lookupRsvp(email);
  if (seq === lookupSeq) setKnown(rsvp);
}

// Check after a short pause in typing, or on blur; never on every keystroke.
emailInput.addEventListener('input', () => {
  clearTimeout(lookupTimer);
  lookupTimer = setTimeout(checkEmail, 500);
});
emailInput.addEventListener('blur', checkEmail);

const answerOf = (question) => $(`.answers[data-question="${question}"] .answer[aria-pressed="true"]`).dataset.value;
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const nameOk = name.length > 0;
  const emailOk = validEmail(email);
  nameInput.setAttribute('aria-invalid', String(!nameOk));
  emailInput.setAttribute('aria-invalid', String(!emailOk));
  if (!nameOk || !emailOk) {
    errorLine.textContent = 'Enter your name and a valid email to lock in your spot.';
    (nameOk ? emailInput : nameInput).focus();
    return;
  }

  if (isClosed()) {
    errorLine.textContent = 'RSVPs closed on Oct 15.';
    renderStartAction();
    return;
  }

  errorLine.textContent = '';
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'SAVING…';
  try {
    guest = await submitRsvp({
      name, email, role: answerOf('role'), hasCar: answerOf('car') === 'yes', website: $('#rsvp-website').value,
    });
    count = guest.lastCount;
    renderCount();
    form.reset();
    pick('role', 'playing');
    pick('car', 'no');
    setKnown(null);
    modal.close();
    show('confirmed');
  } catch (err) {
    if (err instanceof FullError) {
      count = CAP;
      renderCount();
      errorLine.textContent = 'All 20 spots just filled up. The brawl is full.';
    } else if (err instanceof ClosedError) {
      errorLine.textContent = 'RSVPs closed on Oct 15.';
    } else {
      errorLine.textContent = 'Couldn’t reach the scoreboard. Check your connection and try again.';
    }
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = known ? SUBMIT_LABEL.update : SUBMIT_LABEL.add;
  }
});

/* ---------- Confirmed page ---------- */

function renderCard() {
  if (!guest) return;
  const fields = {
    name: guest.name,
    nameUpper: guest.name.toUpperCase(),
    role: guest.role === 'cheering' ? 'Cheering' : 'Playing',
    car: guest.hasCar ? 'Yes' : 'No car',
    position: guest.position,
  };
  $$('[data-card]').forEach((el) => { el.textContent = fields[el.dataset.card]; });
}

inBtn.addEventListener('click', () => show('confirmed'));
$('#back-btn').addEventListener('click', () => {
  show('start');
  inBtn.focus();
});

/* ---------- Install card (PWA) ---------- */

const installCard = $('#install-card');
const installBtn = $('#install-btn');
const installHelp = $('#install-help');
const CHECK = '<svg viewBox="0 0 5 4" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M4 0h1v1H4z M3 1h1v1H3z M0 2h1v1H0z M2 2h1v1H2z M1 3h1v1H1z"/></svg>';
let installPrompt = null;

function markInstalled() {
  installBtn.innerHTML = `ADDED${CHECK}`;
  installBtn.disabled = true;
}

function renderInstall() {
  if (isStandalone()) { installCard.hidden = true; return; }
  if (installPrompt) {
    installCard.hidden = false;
    installBtn.hidden = false;
  } else if (isIOS) {
    installCard.hidden = false;
    installBtn.hidden = true;
    installHelp.textContent = 'Tap Share, then Add to Home Screen.';
  } else {
    installCard.hidden = true;
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  renderInstall();
});
window.addEventListener('appinstalled', () => { installPrompt = null; markInstalled(); });
installBtn.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  if (outcome === 'accepted') markInstalled();
  installPrompt = null;
});

/* ---------- Boot ---------- */

async function boot() {
  count = await fetchCount();
  if (guest && count < guest.position) count = guest.position;
  rememberCount(count);
  renderDeadline();
  renderCount();
  renderInstall();
  // Returning guests (and the installed app) open on their player card.
  show(guest ? 'confirmed' : 'start');
  if (!guest && !narrowQuery.matches) startBtn.focus({ preventScroll: true });
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
