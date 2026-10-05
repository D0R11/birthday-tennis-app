---
target: the RSVP site (start, modal, confirmed; desktop + mobile)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/jdbrc/birthday-tennis-site/public/index.html"
target_fingerprint: "sha256:2e34495f4a08d068dc667bfa909a20810211c72dee6e6861ba0df36f51012486"
target_path: /Users/jdbrc/birthday-tennis-site/public/index.html
timestamp: 2026-10-05T09-05-10Z
slug: public-index-html
closed: true
---
Method: dual-agent (A: design review · B: detector + browser)

# Critique: Bradly's Birthday Brawl (public/index.html, desktop + mobile)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Meter, spots left and SAVING… are good; the confirmed page never says the invite email was sent |
| 2 | Match System / Real World | 3 | Arcade language reads clearly; venue lacks city, map and end time |
| 3 | User Control and Freedom | 1 | No decline, edit or cancel once in; scrim click doesn't close the modal |
| 4 | Consistency and Standards | 3 | Very consistent; REMIND ME is mobile-only; yes/no are toggle buttons, not radios |
| 5 | Error Prevention | 1 | Both questions preselected; looked-up answers leak into the next guest; stale state on reopen |
| 6 | Recognition Rather Than Recall | 3 | Facts repeat in the modal and on the card |
| 7 | Flexibility and Efficiency | 2 | Autofill and returning-guest shortcut; few other accelerators |
| 8 | Aesthetic and Minimalist Design | 3 | Disciplined; PRESS START outranks RSVP NOW; empty sky gap on mobile |
| 9 | Error Recovery | 2 | One generic error at the bottom, which stays after the fix |
| 10 | Help and Documentation | 2 | Game hints only; nothing on what happens after RSVP |
| **Total** | | **23/40** | **Acceptable** |

## Design Specificity Verdict
Authored and specific: 1P/CPU, the HP-bar meter, the numbered player card, the stepped ribbon and the sprite players all come from this one product. It follows DESIGN.md closely. Weak spots are the content (where and when are incomplete) and a generic label-then-input stack in the modal body.

Detector: 39 findings in index.html (79 across public/, including CSS advisories). It agrees with the review on tiny pixel text:
- 28 undersized-ui-text findings;
- truly off-spec: 7px card labels; 8px meter, install and HUD labels; 13/18px sizes off the 4px grid; a 10px confirmation line.

Real bug: `.field__note p` line-height 1.05 vs the 1.2 in the spec. Arguable: the RSVP CONFIRMED kicker. False positives: wide-tracking ×3 (mandated label tracking), cramped-padding (a deliberate band), the overlay's own glow, and the meter animating width (minor). Contrast passes everywhere (6.2–17.6:1) and every tap target is at least 44px. No overlay is visible now; the detector's tab closed.

## Overall Impression
Disciplined arcade world with a great YOU'RE IN! peak. It falls short on accurate, reversible answers and on the basic where and when.

## What's Working
1. The player card as a keepsake, reusing the start screen's label/value style.
2. The cap as a game-native HP meter beside the CTA, plus the spots-left count in the modal.
3. Strong contrast, a consistent 4px cyan focus ring, 44px+ targets and a reduced-motion fallback.

## Priority Issues
- **[P1] Venue and time incomplete, no map.** Fix: "Tenisu, Cuenca, Batangas" linked to maps; "11 AM – 10 PM"; repeat in the modal line and on the card. Command: /impeccable clarify
- **[P1] Answers leak between guests; both questions preselected.** In app.js, `setKnown(null)` doesn't restore the answers and the modal reopens with stale state; a test RSVP saved car "Yes" from player2. Fix: restore answers, reset on open, start unanswered and validate. Command: /impeccable harden
- **[P1] No decline, edit or cancel.** The `openModal` guard blocks stored guests. Fix: EDIT ANSWERS on the confirmed page; a "Can't make it" option that frees the spot. Command: /impeccable shape, then /impeccable harden
- **[P1] No reassurance at the end; REMIND ME mobile-only; the ribbon still says RSVP BY for confirmed guests.** Fix: an "invite sent / same email updates" line; REMIND ME at every width; swap or hide the ribbon when in. Command: /impeccable clarify, then /impeccable polish
- **[P2] PRESS START (80px, blinking) outranks RSVP NOW; empty court area and mobile gap; 7–10px micro text.** Fix: idle court behind a smaller PRESS START; more weight on RSVP NOW; tighter mobile spacing; type back onto the DESIGN.md scale. Command: /impeccable layout, then /impeccable typeset

## Persona Red Flags
- **Jordan:** the game reads as the RSVP; cryptic 1P/CPU; unclear end time and place; unclear whether cheering counts; generic error; no "what's next".
- **Sam:** toggle buttons rather than radios; a stale alert and aria-invalid after the fix; focus lost to body on game start; the disabled CLOSED button can't be focused; the ribbon is read before the title.
- **Casey:** the note plus the error push CONFIRM off-screen; the 720px min-height double-scrolls on a 375×667 phone; a fetch failure shows 0/20.
- **Group-chat friend:** half of where and when; the email lookup reveals a friend's name and answers and allows an overwrite; no next step when full, closed or unable to come.

## Minor Observations
- Errors sit at the bottom of the form rather than per field.
- Last call only changes the ribbon.
- A stale "RALLY OVER" message after returning to the start.
- The desktop court fills half the strip.
- The CONFIRMED label drops to about 3:1 over a grid line on mobile.
- REMIND ME has the same weight as BACK TO START.
- "JOIN THE BRAWL" and "PLAYER NAME" assume a player.
- The placeholder duplicates the label.
- Clicking the scrim doesn't close the modal.

## Questions to Consider
- Why is PRESS START bigger than RSVP NOW? Should the rally be the reward for confirming?
- Does a yes-only RSVP give Bradly an accurate list?
- Should the email lookup reveal someone else's answers?
- What does the confirmed page become on Oct 24?
