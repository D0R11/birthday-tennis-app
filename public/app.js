import {
  CAP,
  FullError,
  ClosedError,
  RateLimitError,
  InvalidError,
  fetchCount,
  lookupRsvp,
  submitRsvp,
  declineRsvp,
  getGuest,
  rememberCount,
  getHiScore,
  setHiScore,
} from "./store.js";
import { createGame } from "./game.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad2 = (n) => String(n).padStart(2, "0");

const narrowQuery = matchMedia("(max-width: 899px)");
const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;
const isIOS =
  /iP(hone|ad|od)/.test(navigator.platform) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const views = { start: $("#view-start"), confirmed: $("#view-confirmed") };
const rsvpBtn = $("#rsvp-btn");
const inBtn = $("#in-btn");
const modal = $("#rsvp-modal");
const form = $("#rsvp-form");
const nameInput = $("#rsvp-name");
const emailInput = $("#rsvp-email");
const errorLine = $("#rsvp-error");
const confirmBtn = $("#confirm-btn");

let count = 0;
let guest = getGuest();
let justEdited = false; // the confirmed page says "updated" right after an edit, "in" otherwise
// In: holds a spot. A guest who said "can't make it" keeps a record on their device, but no spot.
const isIn = () => !!guest && guest.status !== "declined" && !!guest.position;

/* ---------- RSVP deadline ---------- */

// Open until Oct 12, last call Oct 13–15, closed after Oct 15, by the venue's date (Batangas, GMT+8).
// Preview a state with ?deadline=open|last|closed.
const LAST_CALL_FROM = "2026-10-13";
const DEADLINE = "2026-10-15"; // last day to join
const EDIT_UNTIL = "2026-10-23"; // last day to change answers or say "can't make it"
const venueToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const editsClosed = () => venueToday() > EDIT_UNTIL;
const DEADLINE_STATES = {
  open: { lines: ["RSVP BY", "OCT 15"], text: "RSVP by October 15" },
  last: {
    lines: ["LAST CALL", "OCT 15"],
    text: "Last call: RSVP by October 15",
  },
  closed: { lines: ["RSVPS", "CLOSED"], text: "RSVPs closed on October 15" },
  // For guests who are in, the RSVP deadline no longer applies; show what does.
  in: {
    lines: ["EDIT BY", "OCT 23"],
    text: "You're in. You can change your answers until October 23.",
  },
  event: {
    lines: ["SEE YOU", "OCT 24"],
    text: "You're in. See you on October 24.",
  },
};

function deadlineState() {
  const preview = new URLSearchParams(location.search).get("deadline");
  if (preview in DEADLINE_STATES) return preview;
  const today = venueToday();
  if (today > DEADLINE) return "closed";
  return today >= LAST_CALL_FROM ? "last" : "open";
}
const isClosed = () => deadlineState() === "closed";

function renderDeadline() {
  const state = isIn() ? (editsClosed() ? "event" : "in") : deadlineState();
  const { lines, text } = DEADLINE_STATES[state];
  $("#deadline").dataset.state = state;
  $("#deadline-text").textContent = text;
  $$("#deadline text").forEach((el) => {
    el.textContent = lines[Number(el.dataset.line) - 1];
  });
}

/* ---------- Views ---------- */

function show(view) {
  document.body.dataset.view = view;
  views.start.hidden = view !== "start";
  views.confirmed.hidden = view !== "confirmed";
  window.scrollTo(0, 0);
  if (view === "confirmed") {
    startHint.textContent = "KEEP THE RALLY ALIVE"; // a finished rally's score shouldn't greet you on return
    renderCard();
    $("#confirmed-title").focus({ preventScroll: true });
  } else {
    renderStartAction();
  }
}

/* ---------- Meter + CTA ---------- */

// count is null when the scoreboard can't be reached: show "?" rather than a false 0.
function renderCount() {
  const known = count !== null;
  $$("[data-count]").forEach((el) => {
    el.textContent = known ? count : "?";
  });
  $$(".meter__track").forEach((el) => {
    if (known) {
      el.setAttribute("aria-valuenow", count);
      el.removeAttribute("aria-valuetext");
    } else {
      el.setAttribute("aria-valuenow", 0);
      el.setAttribute("aria-valuetext", "Count unavailable");
    }
  });
  $$(".meter__fill").forEach((el) => {
    el.style.width = `${known ? (count / CAP) * 100 : 0}%`;
  });
  $("#spots-left").textContent = known ? CAP - count : "?";
  renderStartAction();
}

function renderStartAction() {
  renderDeadline();
  const closed = isClosed();
  const full = count >= CAP;
  inBtn.hidden = !isIn();
  rsvpBtn.hidden = isIn();
  // Friends who aren't in (and haven't already said no) can tell Bradly they can't make it.
  $("#cant-btn").hidden =
    isIn() || guest?.status === "declined" || editsClosed();
  // aria-disabled, not disabled: the button stays focusable so its reason can be heard.
  const unavailable = closed || full;
  rsvpBtn.setAttribute("aria-disabled", String(unavailable));
  $("#rsvp-status").textContent = closed
    ? "RSVPs closed on October 15."
    : full
      ? "All 20 spots are taken."
      : "";
  if (closed) {
    rsvpBtn.innerHTML =
      '<span class="wide-only">RSVPS CLOSED</span><span class="narrow-only">CLOSED</span>';
  } else {
    rsvpBtn.textContent = full ? "BRAWL IS FULL" : "RSVP NOW";
  }
}

/* ---------- Mini-game ---------- */

const canvas = $("#court-canvas");
const startBtn = $("#start-btn");
const ralliesEl = $("#rallies");
const hiEl = $("#hi-score");
const startHint = $("#start-hint");
const gameStatus = $("#game-status");
hiEl.textContent = pad2(getHiScore());

const game = createGame({
  canvas,
  narrowQuery,
  onRally(n) {
    ralliesEl.textContent = pad2(n);
  },
  onOver(n) {
    const hi = getHiScore();
    if (n > hi) {
      setHiScore(n);
      hiEl.textContent = pad2(n);
    }
    endGame(n);
  },
});

function startGame() {
  ralliesEl.textContent = "00";
  gameStatus.textContent = "";
  startBtn.hidden = true;
  canvas.classList.remove("is-idle");
  document.body.classList.add("is-playing");
  canvas.focus({ preventScroll: true }); // the start button just hid; keep focus on the game
  game.start();
}

function endGame(rallies) {
  game.stop();
  document.body.classList.remove("is-playing");
  canvas.classList.add("is-idle");
  game.showIdle();
  startBtn.hidden = false;
  const word = rallies === 1 ? "RALLY" : "RALLIES";
  startHint.textContent = `RALLY OVER · ${pad2(rallies)} ${word}`;
  gameStatus.textContent = `Rally over. ${rallies} ${rallies === 1 ? "rally" : "rallies"}. Press start to play again.`;
  startBtn.focus({ preventScroll: true });
}

startBtn.addEventListener("click", startGame);
canvas.classList.add("is-idle");
game.showIdle();

/* ---------- Modal ---------- */

// 'join': a new RSVP (or rejoining after "can't make it"). 'edit': a guest changing their own answers.
let mode = "join";
let returnFocus = null;

function showPanel(panel) {
  form.hidden = panel !== "rsvp";
  declineForm.hidden = panel !== "decline";
  modal.setAttribute(
    "aria-labelledby",
    panel === "rsvp" ? "rsvp-title" : "decline-title",
  );
}

function openModal(nextMode = "join") {
  if (
    nextMode === "edit"
      ? !isIn() || editsClosed()
      : (count !== null && count >= CAP) || isIn() || isClosed()
  )
    return;
  if (game.running) {
    game.stop();
    endGame(game.rallies);
  }
  mode = nextMode;
  returnFocus = document.activeElement;
  // Keep whatever the guest already typed, but never stale state: clear errors and recheck the email.
  clearErrors();
  setKnown(null);
  $("#rsvp-title").textContent =
    mode === "edit" ? "EDIT YOUR ANSWERS" : "JOIN THE BRAWL";
  emailInput.readOnly = mode === "edit";
  if (guest?.email && !emailInput.value) {
    // Your own device: fill in your own details (and, when editing, your saved answers).
    nameInput.value = guest.name;
    emailInput.value = guest.email;
  }
  if (mode === "edit") {
    nameInput.value = guest.name;
    emailInput.value = guest.email;
    pick("coming", "in");
    pick("car", guest.hasCar ? "yes" : "no");
  }
  renderComing();
  showPanel("rsvp");
  modal.showModal();
  if (mode === "join" && emailInput.value.trim()) checkEmail();
  nameInput.focus();
}

function closeModal() {
  modal.close();
}

modal.addEventListener("close", () => {
  if (returnFocus?.isConnected && !returnFocus.closest("[hidden]"))
    returnFocus.focus();
  else (isIn() ? inBtn : rsvpBtn).focus();
});
$("#modal-close").addEventListener("click", closeModal);
$(".modal__scrim").addEventListener("click", closeModal); // what was typed stays for next time
rsvpBtn.addEventListener("click", () => openModal("join"));

/* ---------- Single-choice questions (radio groups) ---------- */

const groupOf = (question) => $(`.answers[data-question="${question}"]`);
const answerOf = (question) =>
  groupOf(question).querySelector('.answer[aria-checked="true"]')?.dataset
    .value ?? null;

function pick(question, value, { focus = false } = {}) {
  const group = groupOf(question);
  const options = $$(".answer", group);
  options.forEach((b) =>
    b.setAttribute("aria-checked", String(b.dataset.value === value)),
  );
  // Roving tab stop: the chosen option (or the first, when none is chosen) is the one Tab lands on.
  const current = options.find((b) => b.dataset.value === value) || options[0];
  options.forEach((b) => {
    b.tabIndex = b === current ? 0 : -1;
  });
  if (focus) current.focus();
  if (value) setFieldError(question, "");
  if (question === "coming") renderComing();
}

// "Can't make it" needs no car answer: the question steps aside and the button says what will happen.
function renderComing() {
  const out = answerOf("coming") === "out";
  $("#car-field").hidden = out;
  if (out) setFieldError("car", "");
  if (!submitting) confirmBtn.textContent = submitLabel();
}

function submitLabel() {
  if (answerOf("coming") === "out") return SUBMIT_LABEL.out;
  return known || mode === "edit" ? SUBMIT_LABEL.update : SUBMIT_LABEL.add;
}

$$(".answers").forEach((group) => {
  const question = group.dataset.question;
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".answer");
    if (btn) pick(question, btn.dataset.value);
  });
  group.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      e.key
    ];
    if (!step) return;
    e.preventDefault();
    const options = $$(".answer", group);
    const at = options.indexOf(document.activeElement);
    const next = options[(at + step + options.length) % options.length];
    pick(question, next.dataset.value, { focus: true });
  });
});

/* ---------- Field errors ---------- */

const FIELDS = {
  name: { input: nameInput, error: $("#rsvp-name-error") },
  email: { input: emailInput, error: $("#rsvp-email-error") },
  coming: { input: groupOf("coming"), error: $("#rsvp-coming-error") },
  car: { input: groupOf("car"), error: $("#rsvp-car-error") },
};

function setFieldError(field, message) {
  const { input, error } = FIELDS[field];
  error.textContent = message;
  if (message) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function clearErrors() {
  Object.keys(FIELDS).forEach((field) => setFieldError(field, ""));
  errorLine.textContent = "";
}

nameInput.addEventListener("input", () => setFieldError("name", ""));
emailInput.addEventListener("input", () => setFieldError("email", ""));

/* ---------- "Already on the list" ---------- */

// Only says the email is already in, with its date. It never reveals or fills in anyone's answers.
const emailNote = $("#rsvp-email-note");
const SUBMIT_LABEL = {
  add: "CONFIRM RSVP",
  update: "UPDATE RSVP",
  out: "I CAN'T MAKE IT",
};
let known = null;
let lookupTimer = 0;
let lookupSeq = 0;
let submitting = false;

function formatDate(isoDate) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function setKnown(rsvp) {
  if (mode === "edit") rsvp = null; // editing your own card: no "already on the list" note
  known = rsvp;
  emailInput.classList.toggle("is-known", !!rsvp);
  emailNote.hidden = !rsvp;
  if (rsvp) $("#rsvp-email-date").textContent = formatDate(rsvp.createdAt);
  if (!submitting) confirmBtn.textContent = submitLabel();
}

async function checkEmail() {
  clearTimeout(lookupTimer);
  const email = emailInput.value.trim();
  const seq = ++lookupSeq;
  if (!validEmail(email)) {
    setKnown(null);
    return;
  }
  const rsvp = await lookupRsvp(email);
  if (seq === lookupSeq) setKnown(rsvp);
}

// Check after a short pause in typing, or on blur; never on every keystroke.
emailInput.addEventListener("input", () => {
  if (mode === "edit") return;
  clearTimeout(lookupTimer);
  lookupSeq += 1; // a reply for the old address must not land on the new one
  setKnown(null);
  lookupTimer = setTimeout(checkEmail, 500);
});
emailInput.addEventListener("blur", () => {
  if (mode !== "edit") checkEmail();
});

const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function validate({ name, email, coming, car }) {
  const errors = {
    name: name ? "" : "Enter your name.",
    email: !email
      ? "Enter your email."
      : validEmail(email)
        ? ""
        : "Check your email. It should look like you@email.com.",
    coming: coming ? "" : "Pick one: yes or can't make it.",
    car: car || coming === "out" ? "" : "Pick one: yes or no.",
  };
  Object.entries(errors).forEach(([field, message]) =>
    setFieldError(field, message),
  );
  return Object.keys(errors).find((field) => errors[field]) || null;
}

function focusField(field) {
  const { input } = FIELDS[field];
  const target = input.matches(".answers")
    ? input.querySelector('[tabindex="0"]') || input.querySelector(".answer")
    : input;
  target.focus();
  target.scrollIntoView({ block: "center", behavior: "auto" });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitting) return;
  const name = nameInput.value.trim().replace(/\s+/g, " ");
  const email = emailInput.value.trim();
  const coming = answerOf("coming");
  const car = answerOf("car");

  errorLine.textContent = "";
  const firstInvalid = validate({ name, email, coming, car });
  if (firstInvalid) {
    focusField(firstInvalid);
    return;
  }

  if (coming === "out") {
    // Editing your own card: confirm before giving up the spot. Otherwise, record the no right away.
    if (mode === "edit") openDecline();
    else
      sendDecline(
        { name, email, website: $("#rsvp-website").value },
        {
          button: confirmBtn,
          errorEl: errorLine,
          label: submitLabel,
          onDone: () => {
            form.reset();
            pick("coming", null);
            pick("car", null);
            setKnown(null);
          },
        },
      );
    return;
  }

  if (mode === "edit" ? editsClosed() : isClosed() && !known) {
    errorLine.textContent = mode === "edit" ? CHANGES_CLOSED : JOINS_CLOSED;
    renderStartAction();
    return;
  }

  submitting = true;
  confirmBtn.disabled = true;
  confirmBtn.textContent = "SAVING…";
  try {
    guest = await submitRsvp({
      name,
      email,
      role: "playing",
      hasCar: car === "yes",
      website: $("#rsvp-website").value,
    });
    justEdited = guest.updated;
    count = guest.lastCount;
    renderCount();
    form.reset();
    pick("coming", null);
    pick("car", null);
    setKnown(null);
    modal.close();
    show("confirmed");
  } catch (err) {
    if (err instanceof FullError) {
      count = CAP;
      renderCount();
      errorLine.textContent =
        "All 20 spots just filled up. Check back later: a spot opens whenever someone can’t make it.";
    } else if (err instanceof ClosedError) {
      errorLine.textContent =
        mode === "edit" || known ? CHANGES_CLOSED : JOINS_CLOSED;
      renderStartAction();
    } else if (err instanceof RateLimitError) {
      errorLine.textContent =
        "Too many tries from this connection. Wait a few minutes, then confirm again.";
    } else if (err instanceof InvalidError) {
      errorLine.textContent =
        "Something in the form didn’t go through. Check your name and email, then confirm again.";
    } else {
      errorLine.textContent =
        "Couldn’t reach the scoreboard. Your answers are still here; check your connection and confirm again.";
    }
  } finally {
    submitting = false;
    confirmBtn.disabled = false;
    confirmBtn.textContent = submitLabel();
  }
});

/* ---------- "Can't make it" ---------- */

const declineForm = $("#decline-form");
const declineName = $("#decline-name");
const declineEmail = $("#decline-email");
const declineError = $("#decline-error");
const declineConfirm = $("#decline-confirm");
const CHANGES_CLOSED = "Changes closed on Oct 23. Message Bradly directly.";
const JOINS_CLOSED =
  "RSVPs closed on Oct 15. Message Bradly if you still want to come.";
const DECLINE_FIELDS = {
  name: { input: declineName, error: $("#decline-name-error") },
  email: { input: declineEmail, error: $("#decline-email-error") },
};
let declining = false;
let declineFromEdit = false; // opened by picking "Can't make it" while editing: KEEP goes back to the answers

function setDeclineError(field, message) {
  const { input, error } = DECLINE_FIELDS[field];
  error.textContent = message;
  if (message) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function openDecline() {
  if (editsClosed()) return;
  if (game.running) {
    game.stop();
    endGame(game.rallies);
  }
  // Opened from inside the edit form, focus later returns to what opened that form.
  if (!modal.open) returnFocus = document.activeElement;
  declineFromEdit = modal.open && !form.hidden;
  const fromCard = isIn();
  Object.keys(DECLINE_FIELDS).forEach((f) => setDeclineError(f, ""));
  declineError.textContent = "";
  // From your own card the app already knows who you are; otherwise ask for name and email.
  $("#decline-fields").hidden = fromCard;
  $("#decline-title").textContent = fromCard
    ? "FREE UP YOUR SPOT?"
    : "CAN'T MAKE IT?";
  $("#decline-sub").textContent = fromCard
    ? "That's sad. I hope you can come next time!"
    : "If you already RSVP'd, this frees your spot.";
  $("#decline-keep").textContent = fromCard ? "KEEP MY SPOT" : "NEVER MIND";
  if (!fromCard && guest?.email && !declineEmail.value) {
    declineName.value = guest.name;
    declineEmail.value = guest.email;
  }
  showPanel("decline");
  if (!modal.open) modal.showModal();
  (fromCard ? $("#decline-keep") : declineName).focus(); // the safe choice has focus first
}

$("#decline-close").addEventListener("click", closeModal);
$("#decline-keep").addEventListener("click", () => {
  if (!declineFromEdit) return closeModal();
  pick("coming", "in");
  showPanel("rsvp");
  groupOf("coming").querySelector('[data-value="in"]').focus();
});
declineName.addEventListener("input", () => setDeclineError("name", ""));
declineEmail.addEventListener("input", () => setDeclineError("email", ""));

declineForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (declining) return;
  const fromCard = isIn();
  const name = fromCard
    ? guest.name
    : declineName.value.trim().replace(/\s+/g, " ");
  const email = fromCard ? guest.email : declineEmail.value.trim();
  declineError.textContent = "";
  if (!fromCard) {
    const errors = {
      name: name ? "" : "Enter your name.",
      email: !email
        ? "Enter your email."
        : validEmail(email)
          ? ""
          : "Check your email. It should look like you@email.com.",
    };
    Object.entries(errors).forEach(([f, m]) => setDeclineError(f, m));
    const first = Object.keys(errors).find((f) => errors[f]);
    if (first) {
      DECLINE_FIELDS[first].input.focus();
      return;
    }
  }
  if (editsClosed()) {
    declineError.textContent = CHANGES_CLOSED;
    return;
  }

  sendDecline(
    { name, email, website: $("#decline-website").value },
    {
      button: declineConfirm,
      errorEl: declineError,
      label: () => "YES, I CAN'T MAKE IT",
      onDone: () => declineForm.reset(),
    },
  );
});

// Records a "no" (freeing the guest's spot if they had one), then shows the quiet goodbye page.
async function sendDecline(payload, { button, errorEl, label, onDone }) {
  if (declining) return;
  declining = true;
  button.disabled = true;
  button.textContent = "SAVING…";
  try {
    const result = await declineRsvp(payload);
    guest = getGuest();
    justEdited = false;
    count = result.count;
    renderCount();
    onDone();
    modal.close();
    show("confirmed");
  } catch (err) {
    if (err instanceof ClosedError) errorEl.textContent = CHANGES_CLOSED;
    else if (err instanceof RateLimitError)
      errorEl.textContent =
        "Too many tries from this connection. Wait a few minutes, then try again.";
    else if (err instanceof InvalidError)
      errorEl.textContent =
        "Something didn’t go through. Check your name and email, then try again.";
    else
      errorEl.textContent =
        "Couldn’t reach the scoreboard. Check your connection and try again.";
  } finally {
    declining = false;
    button.disabled = false;
    button.textContent = label();
  }
}

/* ---------- Confirmed page ---------- */

function renderCard() {
  if (!guest) return;
  const out = !isIn();
  views.confirmed.dataset.state = out ? "out" : "in";
  $("#confirmed-out").hidden = !out;
  // A guest who held a spot freed it; a friend who was never in just told Bradly no.
  const hadSpot = guest.wasIn !== false;
  $("#confirmed-title").textContent = !out
    ? "YOU'RE IN!"
    : hadSpot
      ? "NEXT TIME, THEN"
      : "NEXT TIME, THEN";
  $("#confirmed-out-lead").textContent = hadSpot
    ? "Thanks for telling me. Hope we can catch you next time."
    : "Thanks for telling me. See you around!";
  $("#confirmed-out-rejoin").textContent = hadSpot
    ? "Changed your mind? You're always welcome to join us!"
    : "Changed your mind? You can still join us!";
  $("#rejoin-btn").textContent = hadSpot
    ? "REJOIN THE BRAWL"
    : "JOIN THE BRAWL";
  const canRejoin = out && !isClosed() && count !== null && count < CAP;
  $("#confirmed-out-rejoin").hidden = !canRejoin;
  $("#rejoin-btn").hidden = !canRejoin;
  $("#card-actions").hidden = out || editsClosed();
  if (out) return;
  const nameUpper = guest.name.toUpperCase();
  $("#confirmed-kicker").textContent = justEdited
    ? "RSVP UPDATED"
    : "RSVP CONFIRMED";
  $("#confirmed-line").textContent = justEdited
    ? `${nameUpper}'S ANSWERS ARE SAVED`
    : `${nameUpper} HAS ENTERED THE GAME`;
  const fields = {
    name: guest.name,
    car: guest.hasCar ? "Yes" : "No car",
    position: guest.position,
  };
  $$("[data-card]").forEach((el) => {
    el.textContent = fields[el.dataset.card];
  });
}

inBtn.addEventListener("click", () => show("confirmed"));
$("#back-btn").addEventListener("click", () => {
  justEdited = false;
  show("start");
  (isIn() ? inBtn : rsvpBtn).focus();
});
$("#edit-btn").addEventListener("click", () => openModal("edit"));
$("#cant-btn").addEventListener("click", openDecline);
$("#rejoin-btn").addEventListener("click", () => openModal("join"));

/* ---------- Install card (PWA) ---------- */

const installCard = $("#install-card");
const installBtn = $("#install-btn");
const installHelp = $("#install-help");
const CHECK =
  '<svg viewBox="0 0 5 4" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M4 0h1v1H4z M3 1h1v1H3z M0 2h1v1H0z M2 2h1v1H2z M1 3h1v1H1z"/></svg>';
let installPrompt = null;

function markInstalled() {
  installBtn.innerHTML = `ADDED${CHECK}`;
  installBtn.disabled = true;
}

function renderInstall() {
  if (isStandalone()) {
    installCard.hidden = true;
    return;
  }
  if (installPrompt) {
    installCard.hidden = false;
    installBtn.hidden = false;
  } else if (isIOS) {
    installCard.hidden = false;
    installBtn.hidden = true;
    installHelp.textContent = "Tap Share, then Add to Home Screen.";
  } else {
    installCard.hidden = true;
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  renderInstall();
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  markInstalled();
});
installBtn.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  if (outcome === "accepted") markInstalled();
  installPrompt = null;
});

/* ---------- Boot ---------- */

async function boot() {
  count = await fetchCount();
  if (isIn() && (count === null || count < guest.position))
    count = guest.position;
  rememberCount(count);
  renderDeadline();
  renderCount();
  renderInstall();
  // Returning guests (and the installed app) open on their player card.
  show(isIn() ? "confirmed" : "start");
  if (!isIn() && !narrowQuery.matches) startBtn.focus({ preventScroll: true });
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

boot();
