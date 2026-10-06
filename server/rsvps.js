// RSVP API, matching the contract in public/store.js:
//   GET  /api/rsvps          -> { count }   (guests who are in)
//   POST /api/rsvps/lookup   { email } -> { rsvp: { createdAt } | null }
//                            Only whether the email is in and since when: never a guest's name or answers,
//                            since anyone can type a friend's email.
//   POST /api/rsvps          { name, email, role, hasCar } -> { count, position, updated, changed }
//                            New emails and rejoins close after EVENT.deadline; edits after EVENT.editUntil.
//                            409 { error: 'full' | 'closed' }
//   POST /api/rsvps/decline  { name, email } -> { count, wasIn }
//                            "Can't make it": frees the spot (or records a no), until EVENT.editUntil.
// Any device can edit or decline with the email; every real change is emailed to that address.

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { sql } from './db.js';
import { config } from './config.js';
import { EVENT, isClosed, isEditClosed, venueDate, venueToday } from './event.js';
import { describeChanges, sendRsvpEmail } from './email.js';

export const rsvps = Router();

// Any constant works; it just has to be the same for every request that changes the guest list.
const GUEST_LIST_LOCK = 20261024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const limiter = (limit) => rateLimit({
  windowMs: 10 * 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

function readEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'invalid_email');
  return email;
}

function readName(body) {
  // Honeypot: a hidden field people never see. Bots that fill it are turned away.
  if (body?.website) throw new HttpError(400, 'invalid');
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 1 || name.length > 40) throw new HttpError(400, 'invalid_name');
  return name;
}

function readRsvp(body) {
  const name = readName(body);
  if (body.role !== 'playing' && body.role !== 'cheering') throw new HttpError(400, 'invalid_role');
  if (typeof body.hasCar !== 'boolean') throw new HttpError(400, 'invalid_has_car');
  return { name, email: readEmail(body.email), role: body.role, hasCar: body.hasCar };
}

const route = (handler) => async (req, res) => {
  try {
    if (!sql) throw new HttpError(503, 'database_not_configured');
    res.json(await handler(req, res));
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 400) console.warn(`[api] 400 ${req.path}: ${err.code}`);
      res.status(err.status).json({ error: err.code });
    } else {
      console.error('[api]', err);
      res.status(500).json({ error: 'server_error' });
    }
  }
};

rsvps.get('/rsvps', route(async () => {
  return { count: await countIn(sql) };
}));

rsvps.post('/rsvps/lookup', limiter(30), route(async (req) => {
  const email = readEmail(req.body?.email);
  const [row] = await sql`select created_at from rsvps where email = ${email} and status = 'in'`;
  return { rsvp: row ? { createdAt: venueDate(row.created_at) } : null };
}));

const countIn = async (q) => (await q`select count(*)::int as count from rsvps where status = 'in'`)[0].count;

// The lowest free spot, so a freed number is reused and positions never pass the cap.
async function freeSpot(tx) {
  const [free] = await tx`
    select min(p)::int as position from generate_series(1, ${EVENT.cap}::int) p
    where p not in (select position from rsvps where position is not null)`;
  if (free.position === null) throw new HttpError(409, 'full');
  return free.position;
}

rsvps.post('/rsvps', limiter(10), route(async (req) => {
  const guest = readRsvp(req.body);
  const today = venueToday(config.todayOverride);

  // One writer at a time, so two guests can never both take the last spot.
  const result = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${GUEST_LIST_LOCK})`;
    const [existing] = await tx`
      select id, name, role, has_car, position, status, invite_seq from rsvps where email = ${guest.email}`;

    if (existing?.status === 'in') {
      // An edit: allowed from any device until editUntil, even when the brawl is full.
      if (isEditClosed(today)) throw new HttpError(409, 'closed');
      const changes = describeChanges(
        { name: existing.name, role: existing.role, hasCar: existing.has_car },
        { name: guest.name, role: guest.role, hasCar: guest.hasCar },
      );
      if (!changes.length) {
        return { count: await countIn(tx), position: existing.position, updated: true, changed: false };
      }
      const [{ invite_seq: inviteSeq }] = await tx`
        update rsvps set name = ${guest.name}, role = ${guest.role}, has_car = ${guest.hasCar},
          invite_seq = invite_seq + 1, updated_at = now()
        where id = ${existing.id} returning invite_seq`;
      return { count: await countIn(tx), position: existing.position, updated: true, changed: true, email: { kind: 'changed', changes, inviteSeq } };
    }

    // A new guest, or a "can't make it" guest rejoining: both are joins and close after the deadline.
    if (isClosed(today)) throw new HttpError(409, 'closed');
    const position = await freeSpot(tx);
    let inviteSeq = 0;
    if (existing) {
      [{ invite_seq: inviteSeq }] = await tx`
        update rsvps set name = ${guest.name}, role = ${guest.role}, has_car = ${guest.hasCar},
          status = 'in', position = ${position}, invite_seq = invite_seq + 1, invite_sent_at = null, updated_at = now()
        where id = ${existing.id} returning invite_seq`;
    } else {
      await tx`
        insert into rsvps (email, name, role, has_car, position)
        values (${guest.email}, ${guest.name}, ${guest.role}, ${guest.hasCar}, ${position})`;
    }
    return { count: await countIn(tx), position, updated: false, changed: true, email: { kind: 'joined', changes: [], inviteSeq } };
  });

  const { email, ...response } = result;
  if (email) {
    // In the background. Remember a delivered invite, so the host's "send-invites" catch-up skips this guest.
    sendRsvpEmail(email.kind, { ...guest, position: result.position }, email).then((sent) =>
      sent && sql`update rsvps set invite_sent_at = now() where email = ${guest.email} and status = 'in'`.catch(() => {}));
  }
  return response;
}));

rsvps.post('/rsvps/decline', limiter(10), route(async (req) => {
  const name = readName(req.body);
  const email = readEmail(req.body?.email);
  if (isEditClosed(venueToday(config.todayOverride))) throw new HttpError(409, 'closed');

  const result = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${GUEST_LIST_LOCK})`;
    const [existing] = await tx`select id, name, status from rsvps where email = ${email}`;
    if (existing?.status === 'in') {
      const [{ invite_seq: inviteSeq }] = await tx`
        update rsvps set status = 'declined', position = null, invite_seq = invite_seq + 1, invite_sent_at = null, updated_at = now()
        where id = ${existing.id} returning invite_seq`;
      return { count: await countIn(tx), wasIn: true, notify: { name: existing.name, inviteSeq } };
    }
    if (!existing) {
      // A friend who was never coming: Bradly gets a recorded "no".
      await tx`insert into rsvps (email, name, status, position) values (${email}, ${name}, 'declined', null)`;
    }
    return { count: await countIn(tx), wasIn: false };
  });

  const { notify, ...response } = result;
  if (notify) sendRsvpEmail('declined', { name: notify.name, email }, { inviteSeq: notify.inviteSeq });
  return response;
}));
