// The RSVP emails, drawn from the "RSVP emails" frames on the design canvas.
// Email apps need table layout and inline styles. Gmail drops custom fonts and SVG, so the pixel art
// (header, headlines, players, floor) ships as PNGs embedded in the email, and the text falls back
// from Press Start 2P / VT323 to Courier. Regenerate the PNGs from server/email-art/src/ if the art changes.

import { readFileSync } from 'node:fs';
import { config } from './config.js';
import { EVENT } from './event.js';
import { renderText } from './pixel-text.js';

const ART = new URL('./email-art/', import.meta.url);
// Fixed labels and button text in the pixel font, as images (Gmail can't load the font). [width, height, alt]
const TEXT_ART = JSON.parse(readFileSync(new URL('text-sizes.json', ART), 'utf8'));
const textArt = (name) => img(name, TEXT_ART[name][0], TEXT_ART[name][1], TEXT_ART[name][2], 'display:inline-block;vertical-align:middle');
const image = (name) => ({ filename: `${name}.png`, content: readFileSync(new URL(`${name}.png`, ART)), cid: `${name}@brawl` });
const IMAGES = Object.fromEntries(
  [
    'header', 'headline-joined', 'headline-changed', 'headline-declined', 'duo', 'floor',
    ...Object.keys(TEXT_ART),
  ].map((n) => [n, image(n)]),
);

const C = {
  deep: '#0B0920', midnight: '#16123A', panel: '#231C57', chalk: '#F7F3E8', haze: '#A7A2C9',
  yellow: '#FFD23F', pink: '#FF4F7B', cyan: '#3FE0D0',
};
const PIXEL = "'Press Start 2P','Courier New',Courier,monospace";
const BODY = "VT323,'Courier New',Courier,monospace";
const WHEN = 'Sat, Oct 24 · 11 AM to 10 PM';
const CARD_ART = ['label-player-card', 'label-player', 'label-car', 'label-date', 'label-time', 'label-venue', 'link-maps'];

// Text drawn in the pixel fonts for this email, collected while it renders and embedded like the art.
let drawn = [];
function pixel(text, { font = 'vt', size = 24, color = C.chalk, maxWidth = 440, align = 'left' } = {}) {
  const r = renderText(text, { font, size, color, maxWidth, align, lineHeight: font === 'ps' ? 1.6 : 1.2 });
  if (!r) return esc(text); // a character the font lacks: fall back to live text
  const cid = `text-${drawn.length}@brawl`;
  drawn.push({ filename: `text-${drawn.length}.png`, content: r.png, cid, contentDisposition: 'inline' });
  return `<img src="cid:${cid}" width="${r.width}" height="${r.height}" alt="${esc(text)}" style="display:inline-block;border:0;outline:none;width:${r.width}px;height:${r.height}px;vertical-align:middle">`;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const carLabel = (hasCar) => (hasCar ? 'Yes' : 'No car');

const img = (name, w, h, alt, style = '') =>
  `<img src="cid:${IMAGES[name].cid}" width="${w}" height="${h}" alt="${esc(alt)}" style="display:block;border:0;outline:none;width:${w}px;height:${h}px;${style}">`;

const para = (text, { color = C.haze, top = 0, maxWidth = 440 } = {}) =>
  `<tr><td align="center" style="padding:${top}px 0 0;font-family:${BODY};font-size:22px;line-height:1.25;color:${color}">${pixel(text, { color, maxWidth, align: 'center' })}</td></tr>`;

function header(dim) {
  return `<tr><td align="center" style="background:${C.deep}${dim ? ';opacity:0.85' : ''}">${img('header', 600, 150, "Bradly's Birthday Brawl")}</td></tr>`;
}

function footer(lines) {
  const text = lines.map((l) => `<div style="margin:0 0 8px">${pixel(l, { size: 20, color: C.haze, maxWidth: 536, align: 'center' })}</div>`).join('');
  return `<tr><td style="background:${C.midnight}">${img('floor', 600, 96, '')}</td></tr>
<tr><td align="center" style="background:${C.midnight};padding:8px 32px ${lines.length ? 32 : 24}px;font-family:${BODY};font-size:16px;line-height:1.3;color:${C.haze}">${text}</td></tr>`;
}

const label = (name) => `<div style="line-height:0">${textArt(name)}</div>`;
function value(text) {
  return `<div style="padding-top:10px;font-family:${BODY};font-size:24px;line-height:1.15;color:${C.chalk}">${pixel(text, { size: 30, maxWidth: 440 })}</div>`;
}

function card(guest) {
  const cell = (inner, colspan = 2) => `<td colspan="${colspan}" valign="top" style="padding:0 0 24px">${inner}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:${C.panel};border:4px solid ${C.chalk};box-shadow:8px 8px 0 ${C.pink}">
<tr><td colspan="2" style="background:${C.deep};border-bottom:4px solid ${C.chalk};padding:14px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="line-height:0">${textArt('label-player-card')}</td>
<td align="right" style="font-family:${PIXEL};font-size:14px;letter-spacing:0.08em;color:${C.yellow}">${pixel(`#${guest.position} OF ${EVENT.cap}`, { font: 'ps', size: 12, color: C.yellow })}</td>
</tr></table></td></tr>
<tr><td colspan="2" style="padding:24px 24px 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>${cell(label('label-player') + value(guest.name))}</tr>
<tr>${cell(label('label-car') + value(carLabel(guest.hasCar)), 1)}${cell(label('label-date') + value('Sat, Oct 24'), 1)}</tr>
<tr>${cell(label('label-time') + value('11 AM to 10 PM'))}</tr>
<tr>${cell(label('label-venue') + value(EVENT.location) +
    `<div style="padding-top:12px;line-height:0"><a href="${EVENT.mapUrl}" style="color:${C.cyan}">${textArt('link-maps')}</a></div>`)}</tr>
</table></td></tr>
</table>`;
}

function primaryButton(art, href) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="${C.yellow}" style="background:${C.yellow};border:4px solid ${C.deep};box-shadow:6px 6px 0 ${C.pink}">
<a href="${href}" style="display:block;padding:20px 12px;line-height:0;color:${C.deep};text-decoration:none">${textArt(art)}</a>
</td></tr></table>`;
}

function outlineButton(art, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
<td align="center" style="border:3px solid ${C.chalk}">
<a href="${href}" style="display:block;padding:16px 24px;line-height:0;color:${C.chalk};text-decoration:none">${textArt(art)}</a>
</td></tr></table>`;
}

function changesBox(changes) {
  const lines = changes.map((l) => `<div style="padding-top:12px;font-family:${BODY};font-size:24px;line-height:1.2;color:${C.chalk}">${pixel(l, { maxWidth: 460 })}</div>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.deep};border:3px solid ${C.cyan}">
<tr><td style="padding:20px 24px">
<div style="line-height:0">${textArt('label-what-changed')}</div>${lines}
</td></tr></table>`;
}

function page({ preheader, rows }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<title>${esc(EVENT.title)}</title>
<style>body{margin:0;padding:0}a{color:${C.cyan}}@media (max-width:620px){.wrap{width:100%!important}.pad{padding-left:20px!important;padding-right:20px!important}}</style>
</head>
<body style="margin:0;padding:0;background:#FFFFFF">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FFFFFF">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background:#FFFFFF">
<tr><td align="center" style="padding:24px 0">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.deep}" style="width:600px;background:${C.deep};color:${C.chalk}">
${rows}
</table>
</td></tr></table>
</body></html>`;
}

const main = (inner) => `<tr><td class="pad" style="padding:16px 40px 48px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${inner}</table>
</td></tr>`;

const row = (html, top = 0) => `<tr><td align="center" style="padding-top:${top}px">${html}</td></tr>`;

/** Subject, HTML, plain text and embedded images for one RSVP email. */
export function renderEmail(kind, guest, changes = []) {
  drawn = [];
  const out = build(kind, guest, changes);
  return { ...out, attachments: [...imageAttachments(out.images), ...drawn] };
}

function build(kind, guest, changes) {
  const site = config.publicUrl;

  if (kind === 'joined') {
    const html = page({
      preheader: `${WHEN} · ${EVENT.location}. Your calendar invite is attached.`,
      rows: header(false) + main(
        row(img('headline-joined', 520, 76, "YOU'RE IN!")) +
        row(`<div style="font-family:${PIXEL};font-size:16px;line-height:1.6;letter-spacing:0.04em;color:${C.chalk}">${pixel(`${guest.name.toUpperCase()} HAS ENTERED THE GAME`, { font: 'ps', size: 16, maxWidth: 520, align: 'center' })}</div>`, 16) +
        row(img('duo', 520, 136, ''), 24) +
        row(card(guest), 24) +
        para('Your calendar invite is attached.', { top: 32 }) +
        row(primaryButton('button-player-card', site), 24),
      ) + footer([`${WHEN} · ${EVENT.location}`, "You're getting this because you RSVP'd at bbbrawl.app."]),
    });
    const text = [
      `You're in! ${guest.name} has entered the game.`,
      `Player card #${guest.position} of ${EVENT.cap}\nBringing a car: ${carLabel(guest.hasCar)}`,
      `${WHEN}\n${EVENT.location}\nMap: ${EVENT.mapUrl}`,
      `Your calendar invite is attached.\nYour player card: ${site}`,
    ].join('\n\n');
    return { subject: `You're in! ${EVENT.title} · Sat, Oct 24`, html, text, images: ['header', 'headline-joined', 'duo', 'floor', ...CARD_ART, 'button-player-card'] };
  }

  if (kind === 'changed') {
    const html = page({
      preheader: `What changed: ${changes.join(', ')}`,
      rows: header(false) + main(
        row(img('headline-changed', 520, 52, 'RSVP UPDATED')) +
        para(`You changed your answers for ${EVENT.title}.`, { color: C.chalk, top: 24 }) +
        row(changesBox(changes), 24) +
        row(card(guest), 24) +
        para('The updated calendar invite is attached.', { top: 32 }) +
        row(primaryButton('button-player-card', site), 24) +
        para("Wasn't you?", { color: C.chalk, top: 24 }),
      ) + footer([`${WHEN} · ${EVENT.location}`, "You're getting this because your RSVP at bbbrawl.app changed."]),
    });
    const text = [
      `You changed your answers for ${EVENT.title}.`,
      `What changed:\n${changes.join('\n')}`,
      `Player card #${guest.position} of ${EVENT.cap}\nBringing a car: ${carLabel(guest.hasCar)}`,
      `${WHEN}\n${EVENT.location}\nMap: ${EVENT.mapUrl}`,
      `The updated calendar invite is attached.\nYour player card: ${site}`,
      "Wasn't you?",
    ].join('\n\n');
    return { subject: `Your RSVP changed · ${EVENT.title}`, html, text, images: ['header', 'headline-changed', 'floor', ...CARD_ART, 'label-what-changed', 'button-player-card'] };
  }

  // 'declined': quiet, like the goodbye page. No card, no players, no map.
  const html = page({
    preheader: "I'm sad that you can't make it!",
    rows: header(true) + `<tr><td class="pad" style="padding:40px 56px 56px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${row(img('headline-declined', 488, 40, 'NEXT TIME, THEN'))}
${para("I'm sad that you can't make it!", { top: 24, maxWidth: 488 })}
${para("Changed your mind? You're still welcome to join us!", { top: 24, maxWidth: 488 })}
${row(outlineButton('button-rejoin', site), 24)}
${para("Wasn't you?", { top: 32, maxWidth: 488 })}
</table></td></tr>` + footer([]),
  });
  const text = [
    "Next time, then.",
    "I'm sad that you can't make it!",
    `Changed your mind? You're still welcome to join us: ${site}`,
    "Wasn't you?",
  ].join('\n\n');
  return { subject: `You've given up your spot · ${EVENT.title}`, html, text, images: ['header', 'headline-declined', 'floor', 'button-rejoin'] };
}

/** nodemailer attachments for the images an email uses, embedded by Content-ID. */
export const imageAttachments = (names) => names.map((n) => ({ ...IMAGES[n], contentDisposition: 'inline' }));
