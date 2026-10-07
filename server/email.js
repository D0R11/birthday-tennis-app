import nodemailer from 'nodemailer';
import { config } from './config.js';
import { EVENT, buildIcs, inviteSequence } from './event.js';
import { renderEmail } from './email-template.js';

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

/** Old vs new answers, as display lines ("Bringing a car: No car → Yes"). Empty when nothing changed. */
export function describeChanges(before, after) {
  const lines = [];
  if (before.name !== after.name) lines.push(`Name: ${before.name} → ${after.name}`);
  if (before.role !== after.role) lines.push(`Role: ${roleLabel(before.role)} → ${roleLabel(after.role)}`);
  if (before.hasCar !== after.hasCar) lines.push(`Bringing a car: ${carLabel(before.hasCar)} → ${carLabel(after.hasCar)}`);
  return lines;
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
  const { subject, html, text, attachments } = renderEmail(kind, guest, changes);

  try {
    await transporter.sendMail({
      from: config.mailFrom,
      to: { name: guest.name, address: guest.email },
      subject,
      text,
      html,
      attachments,
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
