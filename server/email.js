import nodemailer from 'nodemailer';
import { config } from './config.js';
import { EVENT, buildIcs, inviteSequence } from './event.js';

// Sends through any SMTP email service; switching services only changes the SMTP_* variables.
const { smtp } = config;
const transporter = smtp && config.mailFrom
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465, // 465 is TLS from the start; 587 upgrades with STARTTLS
      auth: { user: smtp.user, pass: smtp.pass },
    })
  : null;

/** "Name <addr@x>" or "addr@x" -> { name, email } */
function parseFrom(from) {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || EVENT.title, email: m[2] } : { name: EVENT.title, email: from.trim() };
}

const roleLabel = (role) => (role === 'cheering' ? 'Cheering' : 'Playing');
const carLabel = (hasCar) => (hasCar ? 'Yes' : 'No car');
const WHEN_WHERE = ['Sat, Oct 24 · 11 AM to 10 PM', EVENT.location];
const NOT_YOU = "Wasn't you? Tell Bradly.";

/** Old vs new answers, as display lines ("Role: Playing → Cheering"). Empty when nothing changed. */
export function describeChanges(before, after) {
  const lines = [];
  if (before.name !== after.name) lines.push(`Name: ${before.name} → ${after.name}`);
  if (before.role !== after.role) lines.push(`Role: ${roleLabel(before.role)} → ${roleLabel(after.role)}`);
  if (before.hasCar !== after.hasCar) lines.push(`Bringing a car: ${carLabel(before.hasCar)} → ${carLabel(after.hasCar)}`);
  return lines;
}

function compose(kind, guest, changes) {
  const card = [`Player card #${guest.position} of ${EVENT.cap}`, `Bringing a car: ${carLabel(guest.hasCar)}`];
  if (kind === 'joined') {
    return {
      subject: `You're in! ${EVENT.title} · Sat, Oct 24`,
      lead: `You're in! See you on court, ${guest.name}.`,
      blocks: [card, WHEN_WHERE, [`The calendar invite is attached. Your card: ${config.publicUrl}`]],
    };
  }
  if (kind === 'changed') {
    return {
      subject: `Your RSVP changed · ${EVENT.title}`,
      lead: `Your RSVP for ${EVENT.title} was just changed.`,
      blocks: [changes, card, WHEN_WHERE, ['The updated calendar invite is attached.', NOT_YOU]],
    };
  }
  return {
    subject: `You've given up your spot · ${EVENT.title}`,
    lead: `You've given up your spot at ${EVENT.title}, and Bradly can see you can't make it.`,
    blocks: [
      ['The event is being removed from your calendar.'],
      [`Changed your mind? Rejoin while spots last: ${config.publicUrl}`],
      [NOT_YOU],
    ],
  };
}

/**
 * Email a guest about their RSVP: kind is 'joined' (new or rejoined), 'changed' (answers edited)
 * or 'declined' (gave up their spot). Never throws: the RSVP is saved whether or not the email goes out.
 * Resolves true when the email service accepted the email.
 */
export async function sendRsvpEmail(kind, guest, { changes = [], inviteSeq = 0 } = {}) {
  if (!transporter) {
    console.log(`[email] SMTP not configured; skipped "${kind}" email`);
    return false;
  }
  const organizer = parseFrom(config.mailFrom);
  const { subject, lead, blocks } = compose(kind, guest, changes);
  const text = [lead, ...blocks.map((b) => b.join('\n'))].join('\n\n');
  const html = [lead, ...blocks.map((b) => b.map(escapeHtml).join('<br>'))].map((p) => `<p>${p}</p>`).join('\n');

  try {
    await transporter.sendMail({
      from: config.mailFrom,
      to: { name: guest.name, address: guest.email },
      subject,
      text,
      html,
      icalEvent: {
        method: kind === 'declined' ? 'CANCEL' : 'REQUEST',
        filename: kind === 'declined' ? 'birthday-brawl-cancelled.ics' : 'birthday-brawl.ics',
        content: buildIcs({
          method: kind === 'declined' ? 'CANCEL' : 'REQUEST',
          organizer,
          attendee: { name: guest.name, email: guest.email },
          url: config.publicUrl,
          sequence: inviteSequence(inviteSeq),
        }),
      },
    });
    console.log(`[email] "${kind}" email sent`);
    return true;
  } catch (err) {
    console.error(`[email] "${kind}" email failed:`, err.message);
    return false;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
