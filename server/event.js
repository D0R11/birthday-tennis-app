// The one place event facts live. The calendar file, emailed invites and RSVP rules all read from
// here; the front end mirrors the dates in public/app.js and the copy in public/index.html.

export const EVENT = {
  title: "Bradly's Birthday Brawl",
  date: '2026-10-24',
  start: '11:00',
  end: '22:00',
  timeZone: 'Asia/Manila', // GMT+8, no daylight saving
  location: 'Tenisu, Cuenca, Batangas',
  description: "Team tennis for Bradly's birthday. 11 AM to 10 PM at Tenisu, Cuenca, Batangas. Bring your racket, or come to cheer.",
  cap: 20,
  lastCallFrom: '2026-10-13',
  deadline: '2026-10-15',
  // Bump when the date, time or place changes, so calendars replace the old event.
  sequence: 1,
  uid: 'bradlys-birthday-brawl-20261024@birthday-brawl',
};

/** Today's date (YYYY-MM-DD) at the venue. */
export function venueToday(override = null) {
  return override || new Date().toLocaleDateString('en-CA', { timeZone: EVENT.timeZone });
}

export const isClosed = (today) => today > EVENT.deadline;

/** Format a timestamp as the venue's local date (YYYY-MM-DD). */
export function venueDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-CA', { timeZone: EVENT.timeZone });
}

/* ---------- iCalendar ---------- */

const escapeText = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const localStamp = (date, time) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
const utcStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// RFC 5545: lines over 75 octets continue on the next line, indented by one space.
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1; // don't split a UTF-8 character
    parts.push(bytes.subarray(start, end).toString('utf8'));
    start = end;
  }
  return parts.join('\r\n ');
}

/**
 * The event as an .ics file.
 * method PUBLISH: the "add to calendar" download. method REQUEST: an emailed invite, which needs
 * an organizer and the guest as attendee.
 */
export function buildIcs({ method = 'PUBLISH', organizer = null, attendee = null, url = null } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${EVENT.title}//RSVP//EN`,
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VTIMEZONE',
    `TZID:${EVENT.timeZone}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:PST',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${EVENT.uid}`,
    `SEQUENCE:${EVENT.sequence}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${EVENT.timeZone}:${localStamp(EVENT.date, EVENT.start)}`,
    `DTEND;TZID=${EVENT.timeZone}:${localStamp(EVENT.date, EVENT.end)}`,
    `SUMMARY:${escapeText(EVENT.title)}`,
    `LOCATION:${escapeText(EVENT.location)}`,
    `DESCRIPTION:${escapeText(EVENT.description)}`,
    'STATUS:CONFIRMED',
  ];
  if (url) lines.push(`URL:${url}`);
  if (organizer) lines.push(`ORGANIZER;CN="${organizer.name}":mailto:${organizer.email}`);
  if (attendee) {
    lines.push(`ATTENDEE;CN="${attendee.name.replace(/"/g, "'")}";ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${attendee.email}`);
  }
  lines.push(
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(`${EVENT.title} is tomorrow`)}`, 'TRIGGER:-P1D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(`${EVENT.title} starts in 2 hours`)}`, 'TRIGGER:-PT2H', 'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );
  return lines.map(fold).join('\r\n') + '\r\n';
}
