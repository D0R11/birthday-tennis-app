import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from './config.js';
import { EVENT, buildIcs } from './event.js';

// AWS credentials come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY via the SDK's default chain.
const transporter = config.awsRegion && config.mailFrom
  ? nodemailer.createTransport({ SES: { sesClient: new SESv2Client({ region: config.awsRegion }), SendEmailCommand } })
  : null;

/** "Name <addr@x>" or "addr@x" -> { name, email } */
function parseFrom(from) {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || EVENT.title, email: m[2] } : { name: EVENT.title, email: from.trim() };
}

/**
 * Email the guest a calendar invite. Never throws: an RSVP is saved whether or not the email goes out.
 */
export async function sendInvite({ name, email, role, hasCar, position, updated }) {
  if (!transporter) {
    console.log(`[email] SES not configured; skipped invite to ${email}`);
    return;
  }
  const organizer = parseFrom(config.mailFrom);
  const roleLine = role === 'cheering' ? 'Cheering' : 'Playing';
  const carLine = hasCar ? 'Yes' : 'No car';
  const lead = updated ? 'Your answers are updated.' : "You're in!";
  const text = [
    `${lead} See you on court, ${name}.`,
    '',
    `Player card #${position} of ${EVENT.cap}`,
    `Role: ${roleLine}`,
    `Bringing a car: ${carLine}`,
    '',
    'Sat, Oct 24 · 11 AM to 10 PM',
    EVENT.location,
    '',
    `The calendar invite is attached. Your card: ${config.publicUrl}`,
  ].join('\n');
  const html = `<p>${lead} See you on court, ${escapeHtml(name)}.</p>
<p><strong>Player card #${position} of ${EVENT.cap}</strong><br>Role: ${roleLine}<br>Bringing a car: ${carLine}</p>
<p>Sat, Oct 24 · 11 AM to 10 PM<br>${escapeHtml(EVENT.location)}</p>
<p>The calendar invite is attached. <a href="${config.publicUrl}">Open your player card</a>.</p>`;

  try {
    await transporter.sendMail({
      from: config.mailFrom,
      to: { name, address: email },
      subject: updated ? `RSVP updated · ${EVENT.title}` : `You're in! ${EVENT.title} · Sat, Oct 24`,
      text,
      html,
      icalEvent: {
        method: 'REQUEST',
        filename: 'birthday-brawl.ics',
        content: buildIcs({ method: 'REQUEST', organizer, attendee: { name, email }, url: config.publicUrl }),
      },
    });
    console.log(`[email] invite sent to ${email}`);
  } catch (err) {
    console.error(`[email] invite to ${email} failed:`, err.message);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
