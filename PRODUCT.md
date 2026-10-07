# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A progressive web app: installable to the home screen, with the guest's player card available offline. Most guests use it on their phones.

## Users

- **Guests:** Bradly's friends, invited to his birthday tennis outing. They open the link, usually on a phone, to say whether they're coming and whether they're bringing a car. Everyone who comes plays. They come back later to check their player card, the details and (on the day) the action.
- **The host:** Bradly, who needs to know who's coming, how many will play, and who has a car. He views the guest list in Supabase or through the token-protected admin export.

## Product Purpose

RSVPs for **Bradly's Birthday Brawl**, a team-tennis birthday outing. Success means every invited friend can RSVP in under a minute, the host has an accurate guest list (who's coming, who can't, who has a car) before the deadline, and guests arrive on the day knowing when and where.

## Positioning

A personal invitation that plays like an arcade game rather than a form: guests can rally against "CPU · Bradly" in a mini-game before they RSVP, and confirming hands them a player card instead of a receipt.

## Operating Context

- **Event:** Sat, Oct 24, 2026, 11 AM to 10 PM, at Tenisu, Cuenca, Batangas (Asia/Manila, GMT+8).
- **RSVP window:** open until Oct 12, "last call" Oct 13–15, closed to new RSVPs after Oct 15 (Manila time). Guests who are in can change their answers or say "can't make it" until Oct 23.
- **Cap:** 20 guests. At 20 the RSVP button becomes "BRAWL IS FULL"; an existing guest can still update their answers.
- **Flow:** the start screen (rally mini-game, event details, confirmed meter, RSVP NOW) leads to the RSVP modal (name, email, are you coming?, bringing a car?). Answering "Can't make it" records a no and skips the car question, then to the confirmed page with the player card, an install prompt, ADD TO CALENDAR (adds the event to the guest's calendar) and BACK TO START.
- Confirming emails the guest a calendar invite. Repeat emails update the existing RSVP rather than taking a new spot.
- **Changing plans:** any device can edit or decline an RSVP with its email (EDIT ANSWERS and "Can't make it anymore?" on the player card, or "Can't make it?" on the start screen). Every real change emails that address, with a "Wasn't you? Tell Bradly." line. A decline frees the spot and stays on Bradly's list as "can't make it"; a friend who was never in can also record a no.

## Capabilities and Constraints

- **Live now:** RSVP with the cap and deadline enforced on the server; repeat-email lookup (note only, never anyone's answers) and update; edit and "can't make it" with change emails and calendar cancellations; player card; add-to-calendar file; emailed invites over SMTP (Resend); installable PWA; offline player card; host guest-list export.
- **Stack:**
  - Front end: vanilla HTML/CSS/ES modules in `public/`, with no build step.
  - Back end: Express in `server/`.
  - Database: Supabase Postgres.
  - Email: Resend, over SMTP.
  - Hosting: Railway, deployed from GitHub `D0R11/birthday-tennis-app`.
- **Planned before Oct 24:**
  - Teams and brackets: assigning players to teams, plus the tournament draw and match schedule.
  - Live scores used during the event.

  Their details (team sizes, format, who enters scores) are undecided.
- **After the event:** the site stays up as a memento with results. RSVP closes. What else it holds (photos, a thank-you) is undecided.
- **Terminology:**
  - The guest is "1P · YOU" and the host is "CPU · BRADLY".
  - "Player card": the RSVP confirmation.
  - "Rallies" and "hi score": from the mini-game.
  - "Spots left" and "confirmed": the cap.

## Brand Commitments

- **Name:** "Bradly's Birthday Brawl", tagline "A TENNIS CELEBRATION".
- **Voice:**
  - Arcade cabinet: short upper-case calls to action ("PRESS START", "RSVP NOW", "YOU'RE IN!").
  - Sentence case for anything people read.
  - Address the guest as "you" and the host as "Bradly".
  - No emoji.
- **Language:** English only.
- **Design authority:**
  - The Birthday Brawl design system (claude.ai artifact `QbTB4k6De7kbhPQdp942BU`): the 8-bit arcade identity, tokens, components and sprites.
  - The RSVP design canvas (claude.ai artifact `4agBcKXZG3kCuoTb5X9pSZ`): the frames the site implements.
  - `public/tokens.css` is generated from the design system's `tokens.json`.
  - Where the two sources disagree, the canvas wins for the site; for example, the deadline is a top-right corner ribbon.

## Evidence on Hand

- **Sprites and backgrounds** (pixel SVGs) in `public/assets/`: the racket, ball, side-view and top-down players for you and Bradly, the starfield and the court.
- **App icons** in `public/icons/`.
- No photos, testimonials, results or past-event material exist yet. Don't invent team names, scores, guests or quotes.

## Product Principles

1. **RSVP first.** Every screen keeps RSVP NOW as the single call to action until the guest is in; the game invites play but never blocks or delays the RSVP.
2. **The rules are real.** The cap, the deadline and the guest list are enforced by the server and never faked on the page.
3. **The guest's card goes with them.** Once in, a guest can reopen their card, details and calendar reminder on their phone, even offline.
4. **Play, then the event.** Game language and moments of play are the product's personality, but date, time, place and the guest's own answers stay plain and unmissable.
5. **Built to grow until the day.** New features (teams, brackets, live scores, then the memento) extend the same world and flows rather than adding separate tools.

## Accessibility & Inclusion

- The design system sets the floor:
  - Text clears 4.5:1 on its grounds.
  - A 4px cyan focus ring.
  - Touch targets of at least 44px.
  - Display type never below 7px; body type never below 18px.
- Blinking and twinkling stop under `prefers-reduced-motion`.
- The mini-game is optional and works with the keyboard (arrow keys, W/S) or by dragging on touch screens.
- Form fields have real labels, and errors are announced.
