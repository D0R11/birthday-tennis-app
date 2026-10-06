---
name: Bradly's Birthday Brawl
description: An 8-bit arcade tennis world in square pixels, hard edges and one down-right shadow.
colors:
  yellow: "#FFD23F"
  yellow-hover: "#FFE066"
  pink: "#FF4F7B"
  cyan: "#3FE0D0"
  deep: "#0B0920"
  midnight: "#16123A"
  panel: "#231C57"
  panel-edge: "#3A3380"
  chalk: "#F7F3E8"
  haze: "#A7A2C9"
  ball: "#D8F03A"
  sky-3: "#45246E"
typography:
  display:
    fontFamily: "\"Press Start 2P\", monospace"
    fontSize: "64px"
    fontWeight: 400
    lineHeight: 1
  press-start:
    fontFamily: "\"Press Start 2P\", monospace"
    fontSize: "80px"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "\"Press Start 2P\", monospace"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "\"Press Start 2P\", monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.12em"
  lead:
    fontFamily: "\"Press Start 2P\", monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "\"Press Start 2P\", monospace"
    fontSize: "8px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.08em"
  body-lg:
    fontFamily: "VT323, monospace"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "VT323, monospace"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.2
  caption:
    fontFamily: "VT323, monospace"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.2
rounded:
  none: "0"
spacing:
  unit-1: "4px"
  unit-2: "8px"
  unit-3: "12px"
  unit-4: "16px"
  unit-6: "24px"
  unit-8: "32px"
  unit-16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.midnight}"
    rounded: "{rounded.none}"
    padding: "0 44px"
    height: "72px"
  button-primary-hover:
    backgroundColor: "{colors.yellow-hover}"
  button-primary-mobile:
    padding: "0 16px"
    height: "52px"
  button-secondary:
    textColor: "{colors.chalk}"
    rounded: "{rounded.none}"
    padding: "0 28px"
    height: "56px"
  button-disabled:
    textColor: "{colors.haze}"
    rounded: "{rounded.none}"
  answer:
    textColor: "{colors.chalk}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "48px"
  answer-selected:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.midnight}"
  answer-car-selected:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.midnight}"
  input:
    backgroundColor: "{colors.midnight}"
    textColor: "{colors.chalk}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "52px"
  player-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.none}"
    width: "560px"
  modal:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.none}"
    width: "640px"
    height: "660px"
  meter-fill:
    backgroundColor: "{colors.cyan}"
    height: "24px"
---

# Design System: Bradly's Birthday Brawl

## Overview

**Creative North Star: "The 8-Bit Court"**

Tennis first, rendered as a retro sprite world. The court, the racket, the ball and the rally are the visual vocabulary, drawn the way a late-80s cabinet would draw them: every form a stack of square pixels, every edge hard, every surface flat. The site is a game you're already inside: an attract screen with PRESS START, a HUD over a top-down court, a player card when you're in. The forms that serve the RSVP carry the same world, without decoration that would slow anyone down.

The palette is a night sky over the court: deep blue-black grounds with a starfield and a magenta perspective grid, lit by three loud accents (yellow for what matters most, pink for shadow and the court, cyan for you and success). Type comes in exactly two voices: a pixel display face that shouts in upper case, and a terminal face for anything people actually read. Depth exists only as a hard pink offset, like a sprite's drop shadow, and controls physically press into it.

The world rejects three things outright: modern UI softness (rounded corners, blur, gradients, glass, soft shadows); the glossy sports-brand look (photo heroes, italic speed type, swooshes); and the generic event-page or form-builder RSVP layout.

**Key Characteristics:**
- Square pixels only: radius 0, 4px strokes, `shape-rendering: crispEdges` on all art.
- One down-right hard shadow in pink; nothing blurs, nothing glows.
- Two typefaces with strict jobs: Press Start 2P shouts, VT323 explains.
- Dark grounds (deep, midnight, panel) carry about 60% of every screen; yellow, pink and cyan together stay near 10%.
- Motion moves in `steps()`, never on an ease curve.

## Colors

A night-court palette: three neon accents over layered blue-black grounds, with chalk-white text.

### Primary
- **Yellow** (`yellow`): headlines, the wordmark, field labels, the primary button fill, Bradly's shirt. The color of "this is the thing to do". Hover lifts it to **Yellow Hover** (`yellow-hover`).

### Secondary
- **Pink** (`pink`): every hard shadow, the court surface, error text and the last-call ribbon. It never carries chalk text on top of it (2.8:1); only midnight.

### Tertiary
- **Cyan** (`cyan`): Player 1 and anything about "you", success states, the confirmed-meter fill, the tagline, the "already on the list" note and the 4px focus ring.

### Neutral
- **Deep** (`deep`): the page ground under the starfield, the modal header bar, the meter track and the player card's header.
- **Midnight** (`midnight`): input fields, the install card, the starfield floor, and the text on yellow and cyan fills.
- **Panel** (`panel`): raised surfaces: the modal body, the player card body, the closed ribbon.
- **Panel Edge** (`panel-edge`): a quiet hairline for non-interactive cards only (the install card). Never the only border on a control.
- **Chalk** (`chalk`): body text, 4px borders, court lines and the net.
- **Haze** (`haze`): secondary text, HUD hints, captions and every disabled state.

### Named Rules
**The Ten Percent Rule.** Yellow, pink and cyan together cover about 10% of a screen. Deep and midnight carry about 60%, chalk and panel the rest. The accents are loud because they are scarce.

**The Midnight-on-Pink Rule.** Text on a pink fill is always midnight. Chalk on pink fails contrast and is banned.

**The Scenery-Only Rule.** The starfield, grid and sunset steps (`sky-1` to `sky-3`, `grid`, `sunset-1` to `sunset-4` in `tokens.css`) and the sprite colors (`ball`, `ball-shade`, `racket-*`, `skin-*`, `hair`) are scenery. They stack in hard bands or live inside sprites. They never become UI fills, and they never blend into gradients. `sky-3` appears in UI only as the second, deeper shadow on PRESS START and YOU'RE IN!.

## Typography

**Display Font:** Press Start 2P (with monospace)
**Body Font:** VT323 (with monospace)

**Character:** An arcade marquee and a green-screen terminal. Press Start 2P is blocky, wide and always upper case; it labels, commands and celebrates. VT323 is narrow and soft-cornered at its pixel size; it carries the facts, the answers and the help text, so reading never has to fight the display face.

### Hierarchy
- **Display** (400, 64px desktop, scaling down to fit the viewport; 36px/60px stacked on mobile, line-height 1): the "BIRTHDAY BRAWL" wordmark line, with an 8px-family pink hard shadow.
- **Press Start** (400, 48px desktop scaling with the viewport, 24px mobile, line-height 1): the attract-screen call over the court at rest, with a double hard shadow (pink, then sky-3). It stays below the RSVP row in visual weight.
- **Headline** (400, 28px desktop, 20px mobile, line-height 1.3): modal and section titles such as "JOIN THE BRAWL", in yellow with a 4px pink shadow.
- **Lead** (400, 16–20px, upper case): desktop status lines: the lockup, the "RSVP CONFIRMED" kicker, "…HAS ENTERED THE GAME".
- **Label** (400, 12px, letter-spacing 0.12em, upper case): every label, control and status line that fits: field labels, answers, detail labels, the modal header, HUD hints, secondary and link buttons, and the phone's kicker and confirmation line.
- **Micro** (400, 8px, letter-spacing 0.08em, upper case): Press Start 2P's native size, used only where phone width forces it: HUD names, card labels and bar, the meter label, the start screen's "Can't make it?" link and hints.
- **Body Large** (VT323 400, 40px desktop, 20px mobile, line-height 1.1): the three event facts.
- **Body** (VT323 400, 26px, line-height 1.2): paragraphs, input text, modal subtitles (24px).
- **Caption** (VT323 400, 20px, line-height 1.2): help lines and notes. Never below 18px.

### Named Rules
**The Two Voices Rule.** Press Start 2P never sets a sentence people need to read; VT323 never sets a call to action. If it's upper case and short, it's display. If it's a fact, an answer or an explanation, it's body.

**The Floor Rule.** Press Start 2P stays at 8px or larger, and VT323 at 18px or larger.

**The Pixel-Grid Type Rule.** Press Start 2P is drawn on an 8×8 grid, so its sizes sit on the 4px grid (8, 12, 16, 20, 24, 28, 32…). That keeps every font pixel on whole screen pixels on 2× displays; sizes like 9, 10, 11 or 14px smear. The pinned 26px BRADLY'S is the one exception.

## Layout

The desktop is a single 1440 × 900 screen that doesn't scroll. The start screen is a centered column with the space between rows distributed evenly:
- the logo block;
- the game section, 1260px wide: the HUD over a court at a 240:64 ratio;
- the match row: the details list on the left, the confirmed meter and RSVP NOW on the right.

Side padding is 80px, top 36px, bottom 32px. Below 1260px the sections shrink to the viewport. The match row wraps rather than overflowing.

Below 900px the layout switches to the 390 × 844 portrait frame:
- the logo stacks one word per line;
- the game shrinks to a 326px column with a 318px HUD, and the court crops to its middle (a 326:122 box);
- the game stays centred between the logo and the RSVP row (equal space above and below), with spacing tightened on screens under 700px tall;
- the meter and RSVP NOW share a row; the quiet "CAN'T MAKE IT?" link sits centred on its own line beneath them;
- the details become their own evenly spaced row, with the meter-plus-button row below;
- side gutters are 32px.

The confirmed page follows the same column: the lockup, the intro, the player card, then the foot row (meter and BACK TO START on desktop; meter, install card and a two-button grid on mobile). Desktop flanks the card with ×12 player sprites, removed below 1100px. On mobile, ×5 sprites stand on the card's top edge instead.

Every size is a multiple of the 4px pixel unit (`unit-1`); gaps come from the `unit-*` steps. Edges pad with `env(safe-area-inset-*)`, since this is a PWA, and no fake status bar is ever drawn.

### Named Rules
**The Pixel Grid Rule.** Every dimension, gap and offset is a multiple of 4px. A 14px or 18px gap is a bug: round to the nearest `unit-*`.

**The Court-at-Rest Rule.** Before play, the court and players are drawn at rest at 35% opacity behind PRESS START, so the middle of the screen shows tennis, not empty sky, without outranking RSVP NOW. Play brings the court to full strength.

**The One Call Rule.** Each screen has exactly one primary action. On the start screen it's RSVP NOW (or its disabled full or closed state); in the modal it's CONFIRM RSVP or UPDATE RSVP. Everything else is secondary or plain.

## Elevation & Depth

The system is flat at every layer, with depth that is hard-offset and structural. Surfaces never float or glow; they are lifted by a solid pink shadow offset down and to the right, like a sprite's drop shadow, and only things you can act on or must notice get one. Pressing a control moves it 4px down-right into its shadow, so the shadow is the button's travel.

### Shadow Vocabulary
- **Hard Small** (`box-shadow: 4px 4px 0 #FF4F7B`): selected answer buttons, the modal title's text shadow, BRADLY'S in the logo.
- **Hard** (`box-shadow: 8px 8px 0 #FF4F7B`): the primary button on desktop, the player card on mobile.
- **Hard Large** (`box-shadow: 10px 10px 0 #FF4F7B`): the modal and the desktop player card.
- **Pressed** (`box-shadow: 2px 2px 0 #FF4F7B`, with `translate(4px, 4px)`): the primary button while pressed.
- **Ink** (`box-shadow: 4px 4px 0 #0B0920`): marks on colored fills, reversed logos over scenery.

### Named Rules
**The No-Blur Rule.** Every shadow has a blur radius of 0. A blurred, spread or colored glow is a defect.

**The Earned Shadow Rule.** Only primary actions, selected answers, the player card and the modal cast a shadow. Secondary buttons, inputs, meters and quiet cards sit flat.

## Shapes

Every corner is square (`radius 0`). Frames are 4px chalk strokes on desktop and 3px (`stroke-sm`) on mobile meters, keycaps and the install card. All art is pixel SVG with `shape-rendering: crispEdges`, scaled only by whole numbers (×2, ×4, ×5, ×12) and shown with `image-rendering: pixelated`. Diagonals are built as pixel stairs, never smooth lines. The deadline ribbon is a 45° band cut in 4px steps (3px on mobile). Glyphs (✕, ✓, ▲, ▼, i) are drawn as pixel SVG paths.

## Components

### Buttons
Chunky and clicky: thick outlines, hard shadows, a physical press.
- **Shape:** square (0), with a 4px border.
- **Primary:**
  - Desktop: yellow fill, midnight text and border, Hard shadow, Press Start 2P at 20px, 72px tall with 44px side padding.
  - Mobile: 52px tall, 12px type, a 6px pink shadow.
  - Never shorter than 44px.
- **Hover / Pressed / Focus:** hover swaps the fill to yellow-hover; pressed moves the button 4px down-right into the Pressed shadow; focus is a solid 4px cyan outline at a 4px offset.
- **Disabled** ("BRAWL IS FULL", "RSVPS CLOSED" / "CLOSED"): transparent, with a haze border and haze text, no shadow, and a not-allowed cursor.
- **Secondary** (BACK TO START, ADD TO CALENDAR, REJOIN THE BRAWL): a transparent fill with a chalk border and chalk text, no shadow; hover turns the border and text yellow. 56px tall on desktop, 48px on mobile.
- **Status** ("YOU'RE IN!"): a transparent fill with a cyan border and cyan text; it reopens the player card.

### Quiet Links
The way out that never competes with the one primary action: "CAN'T MAKE IT?" under RSVP NOW, "EDIT ANSWERS" under the player card. Inside the form, question 3 ("ARE YOU COMING?") carries the no: "CAN'T MAKE IT" hides the car question and turns the button into SEND MY ANSWER.
- **Style:** haze Press Start text at the label size (8px for the start-screen link on phones), underlined 2px with a 4px offset, no box, no shadow. Hover turns it chalk.
- **Target:** at least 44px tall, even though the visible mark is small.
- **Rule:** at most one quiet link per group, and never as the only route to something a guest must do.

### Answer Buttons (chips)
Single-choice square pills in a `role="group"`.
- **Unselected:** a chalk 4px outline with chalk text, Press Start 2P at 11px, 48px tall with 16px side padding.
- **Selected** (`aria-pressed="true"`): a yellow fill (cyan for the car question), midnight text and border, and the Hard Small shadow.
- They wrap onto a second line on mobile, with a 12px gap.

### Inputs / Fields
- **Style:** a midnight fill, a 4px chalk border, square corners, 52px tall, VT323 at 26px, haze placeholder text. Labels sit above, in 11px numbered display type ("1 · PLAYER NAME").
- **Focus:** a solid 4px cyan outline.
- **Error:** the border turns pink with `aria-invalid`, and one pink VT323 line (22px) explains the fix.
- **Known email:** the border turns cyan, and a note appears below: a deep box with a 3px cyan border and a pixel "i", with the lead-in "Already on the list." in cyan and the rest in chalk. It's information (`role="status"`), never an error.

### Cards / Containers
- **Corner Style:** square (0).
- **Player card:**
  - A panel body in a 4px chalk frame, with the Hard Large shadow (Hard on mobile).
  - A deep header bar under a 4px chalk rule: "PLAYER CARD" in cyan on the left, "#n OF 20" in yellow on the right.
  - A 2 × 3 grid of label/value pairs: yellow display labels over chalk VT323 values (32px desktop, 24px mobile).
  - 560px wide on desktop, 326px on mobile.
- **Install card:** a midnight fill with a quiet 3px panel-edge border and no shadow, holding the ball icon in a 44px deep tile. Its INSTALL button has a 3px cyan outline.

### Modal
A panel box (640 × 660 desktop; 358 × 720 compact mobile) in a 4px chalk frame with the Hard Large shadow, over a deep scrim at 88% opacity.
- **Header:** a 60px deep bar with a 4px chalk rule below. It holds the spots-left count in cyan and a 44px pixel ✕ close button.
- **Title:** "JOIN THE BRAWL" (Headline), with the event line underneath in haze VT323.
- **Height:** it grows to fit the "already on the list" note rather than clipping.

### Decline Panel
The "can't make it" confirmation, a compact version of the modal (no fixed height). Title "FREE UP YOUR SPOT?" for a guest who's in, "CAN'T MAKE IT?" (with name and email fields) for anyone else. A full-width primary "YES, I CAN'T MAKE IT" sits over a flat secondary "KEEP MY SPOT" / "NEVER MIND". When the guest is in, focus starts on the safe choice.

### Scoreboard (HUD)
One line over the court:
- **Left:** "1P · YOU" in cyan, over chalk-bordered ▲ ▼ keycaps (32px desktop with a 4px stroke, 22px mobile with a 3px stroke).
- **Center:** "RALLIES" in pink over the count in yellow with a Hard Small shadow (44px desktop, 28px mobile).
- **Right:** "CPU · BRADLY" in yellow over "HI SCORE nn" in haze ("HI nn" on mobile).
- **Labels never wrap.**

### Meter
An HP bar for the confirmed count: a "CONFIRMED" label in haze, the count in chalk, and a 24px track (20px on mobile) with a 4px chalk border (3px on mobile) around a deep inset. The cyan fill grows in `steps(3)`. It always sits directly left of the primary action.

### Deadline Ribbon (signature)
A stepped pixel band across the start screen's top-right corner (228px desktop on 4px steps; 114px mobile on 3px steps), with 1-step edges and a 2-step hard shade along its lower-left side. Two lines of rotated display type run along the band.
- **Open:** a yellow band with midnight edges and text, and a pink shade; "RSVP BY / OCT 15".
- **Last call:** a pink band with a yellow shade; "LAST CALL / OCT 15".
- **Closed:** a panel band with haze edges and text, and no shade; "RSVPS / CLOSED".

It's information, not a control: a `<p>` with the full sentence for screen readers, and no pointer events.

### Logo
Set in live type, never as an image:
- "BRADLY'S" in chalk with a pink shadow;
- "BIRTHDAY BRAWL" in yellow with a pink hard shadow, followed by the ×5 ball sprite;
- the tagline "A TENNIS CELEBRATION" in cyan, tracked 0.2em.

Desktop sets BIRTHDAY BRAWL on one line; mobile stacks one word per line. The small lockup is the ball plus "BRADLY'S BIRTHDAY BRAWL" at 9–14px, used on the confirmed page.

### Motion
Everything moves in `steps()`:
- the PRESS START call blinks (1.2s, `steps(2)`);
- starfield crosses twinkle (1.6s and 2.3s, `steps(2)`);
- the starfield dims to 70% while the game runs;
- the meter fill steps in three frames.

Under `prefers-reduced-motion`, blinking and twinkling stop and transitions are removed.

## Do's and Don'ts

### Do:
- **Do** build every color, family, gap, stroke and shadow from the `tokens.css` names (`var(--yellow)`, `var(--unit-4)`, `var(--shadow-hard)`); never paste raw hex into component CSS.
- **Do** keep every dimension on the 4px grid, and every corner at 0.
- **Do** give the one primary action per screen the yellow fill and Hard shadow, and press it 4px into Pressed on tap.
- **Do** set midnight text on yellow, cyan and pink fills.
- **Do** draw new art and glyphs as pixel SVG with `crispEdges`, scaled by whole numbers, flipping sprites horizontally (never rotating them) to face each other.
- **Do** use the 4px cyan outline at a 4px offset for focus on every interactive element.
- **Do** keep Press Start 2P sizes on the 4px grid at 8px or larger, VT323 at 18px or larger, and touch targets at 44px or larger.

### Don't:
- **Don't** use rounded corners, blur, gradients, glassmorphism, glows or soft drop shadows anywhere: no modern UI softness.
- **Don't** reach for the sports-brand look: no photo heroes, italic speed type or swooshes.
- **Don't** let any screen fall back to a generic event page or form-builder RSVP layout; the RSVP lives inside the game world (HUD, modal frame, player card).
- **Don't** set chalk text on pink.
- **Don't** put two primary buttons side by side, or give secondary buttons, inputs or quiet cards a shadow.
- **Don't** ease motion with curves; use `steps()` only, and stop blinking under reduced motion.
- **Don't** use emoji; use pixel glyphs (✕, ✓, ▲, ▼) or plain text.
- **Don't** use the scenery colors (`sky-*`, `sunset-*`, `grid`, sprite colors) as UI fills, or blend them into gradients.
