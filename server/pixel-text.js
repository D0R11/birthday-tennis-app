// Draws text in the brand's pixel fonts (Press Start 2P, VT323) as a transparent PNG, for the emails:
// Gmail can't load web fonts, so per-guest text like a name is rendered when the email is sent.
// Glyph masks come from server/email-art/glyphs.json (captured at 2x by email-art/src/glyphs.html).

import { readFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const FONTS = JSON.parse(readFileSync(new URL('./email-art/glyphs.json', import.meta.url), 'utf8'));
const masks = new Map(); // "font:char" -> Uint8Array

const SUBSTITUTES = { '→': '->', '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...' };

function mask(font, ch) {
  const key = `${font}:${ch}`;
  if (!masks.has(key)) {
    const b64 = FONTS[font].glyphs[ch];
    masks.set(key, b64 ? Uint8Array.from(Buffer.from(b64, 'base64')) : null);
  }
  return masks.get(key);
}

/** The text with characters the font lacks swapped for close ones; null if some still can't be drawn. */
function drawable(font, text) {
  const glyphs = FONTS[font].glyphs;
  let out = '';
  for (const ch of text) {
    if (ch in glyphs) out += ch;
    else if (SUBSTITUTES[ch] && [...SUBSTITUTES[ch]].every((c) => c in glyphs)) out += SUBSTITUTES[ch];
    else return null;
  }
  return out;
}

function wrap(text, perLine) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= perLine || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.flatMap((l) => (l.length <= perLine ? [l] : l.match(new RegExp(`.{1,${perLine}}`, 'g'))));
}

function png(width, height, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Renders text to a PNG at 2x. font: 'ps' (Press Start 2P) or 'vt' (VT323); size in CSS px.
 * maxWidth wraps by words; align centres each line within the widest one.
 * Returns { png, width, height } in CSS px, or null when the text has characters the font can't draw.
 */
export function renderText(text, { font, size, color, maxWidth = Infinity, align = 'left', lineHeight = 1.2 }) {
  const name = `${font}${size}`;
  const f = FONTS[name];
  if (!f) throw new Error(`No glyphs for ${name}`);
  const clean = drawable(name, String(text));
  if (clean === null) return null;

  const perLine = Math.max(1, Math.floor((maxWidth * 2) / f.adv));
  const lines = wrap(clean, perLine);
  const step = Math.round(size * lineHeight * 2);
  const width = Math.ceil((Math.max(...lines.map((l) => l.length)) * f.adv) / 2) * 2; // whole CSS px
  const height = step * (lines.length - 1) + f.h;
  const rgba = Buffer.alloc(width * height * 4);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

  lines.forEach((line, row) => {
    const x0 = align === 'center' ? Math.floor((width - line.length * f.adv) / 2) : 0;
    [...line].forEach((ch, col) => {
      const m = mask(name, ch);
      if (!m) return;
      for (let y = 0; y < f.h; y++) {
        const py = row * step + y;
        if (py >= height) break;
        for (let x = 0; x < f.adv; x++) {
          const a = m[y * f.adv + x];
          if (!a) continue;
          const i = (py * width + x0 + col * f.adv + x) * 4;
          rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = Math.max(rgba[i + 3], a);
        }
      }
    });
  });
  return { png: png(width, height, rgba), width: width / 2, height: height / 2 };
}
