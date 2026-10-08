import nodemailer from 'nodemailer';
import { config } from './config.js';
import { EVENT, buildIcs, inviteSequence } from './event.js';
import { renderEmail } from './email-template.js';

// Sends through Resend's web API when there's a key, otherwise through any SMTP service (SMTP_* variables).
// Either way a send gives up after a few seconds instead of hanging.
const { smtp } = config;
const transporter =
  !config.resendApiKey && smtp && config.mailFrom
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465, // 465 is TLS from the start; 587 upgrades with STARTTLS
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      })
    : null;
const canSend = !!config.mailFrom && (!!config.resendApiKey || !!transporter);

async function sendViaResend({ to, subject, text, html, attachments, ics }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${config.resendApiKey}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      from: config.mailFrom,
      to: [`"${to.name.replace(/"/g, "'")}" <${to.address}>`],
      subject,
      text,
      html,
      attachments: [
        ...attachments.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
          content_id: a.cid,
          content_type: 'image/png',
        })),
        {
          filename: ics.filename,
          content: Buffer.from(ics.content).toString('base64'),
          content_type: `text/calendar; method=${ics.method}; charset=UTF-8`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

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
  if (before.hasCar !== after.hasCar)
    lines.push(`Bringing a car: ${carLabel(before.hasCar)} → ${carLabel(after.hasCar)}`);
  return lines;
}

/**
 * Email a guest about their RSVP: kind is 'joined' (new or rejoined), 'changed' (answers edited)
 * or 'declined' (gave up their spot). Never throws: the RSVP is saved whether or not the email goes out.
 * Resolves true when the email service accepted the email.
 */
export async function sendRsvpEmail(kind, guest, { changes = [], inviteSeq = 0 } = {}) {
  if (!canSend) {
    console.log(`[email] email not configured; skipped "${kind}" email`);
    return false;
  }
  try {
    const organizer = parseFrom(config.mailFrom);
    const { subject, html, text, attachments } = renderEmail(kind, guest, changes);

    const method = kind === 'declined' ? 'CANCEL' : 'REQUEST';
    const ics = {
      method,
      filename: kind === 'declined' ? 'birthday-brawl-cancelled.ics' : 'birthday-brawl.ics',
      content: buildIcs({
        method,
        organizer,
        attendee: { name: guest.name, email: guest.email },
        url: config.publicUrl,
        sequence: inviteSequence(inviteSeq),
      }),
    };
    const to = { name: guest.name, address: guest.email };

    if (config.resendApiKey) {
      await sendViaResend({ to, subject, text, html, attachments, ics });
    } else {
      await transporter.sendMail({ from: config.mailFrom, to, subject, text, html, attachments, icalEvent: ics });
    }
    console.log(`[email] "${kind}" email sent`);
    return true;
  } catch (err) {
    console.error(`[email] "${kind}" email failed:`, err.message);
    return false;
  }
}
