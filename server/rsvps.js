// RSVP API, matching the contract in public/store.js:
//   GET  /api/rsvps          -> { count }
//   POST /api/rsvps/lookup   { email } -> { rsvp: { name, role, hasCar, position, createdAt } | null }
//   POST /api/rsvps          { name, email, role, hasCar } -> { count, position, updated }
//                            409 { error: 'full' | 'closed' }

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { sql } from './db.js';
import { config } from './config.js';
import { EVENT, isClosed, venueDate, venueToday } from './event.js';
import { sendInvite } from './email.js';

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

function readRsvp(body) {
  // Honeypot: a hidden field people never see. Bots that fill it are turned away.
  if (body?.website) throw new HttpError(400, 'invalid');
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 40) throw new HttpError(400, 'invalid_name');
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
      res.status(err.status).json({ error: err.code });
    } else {
      console.error('[api]', err);
      res.status(500).json({ error: 'server_error' });
    }
  }
};

rsvps.get('/rsvps', route(async () => {
  const [{ count }] = await sql`select count(*)::int as count from rsvps`;
  return { count };
}));

rsvps.post('/rsvps/lookup', limiter(30), route(async (req) => {
  const email = readEmail(req.body?.email);
  const [row] = await sql`
    select name, role, has_car, position, created_at from rsvps where email = ${email}`;
  if (!row) return { rsvp: null };
  return {
    rsvp: { name: row.name, role: row.role, hasCar: row.has_car, position: row.position, createdAt: venueDate(row.created_at) },
  };
}));

rsvps.post('/rsvps', limiter(10), route(async (req) => {
  const guest = readRsvp(req.body);
  if (isClosed(venueToday(config.todayOverride))) throw new HttpError(409, 'closed');

  // One writer at a time, so two guests can never both take the last spot.
  const result = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${GUEST_LIST_LOCK})`;
    const [existing] = await tx`select id, position from rsvps where email = ${guest.email}`;
    let position;
    if (existing) {
      await tx`
        update rsvps set name = ${guest.name}, role = ${guest.role}, has_car = ${guest.hasCar}, updated_at = now()
        where id = ${existing.id}`;
      position = existing.position;
    } else {
      // The lowest free spot, so a deleted RSVP's number is reused and positions never pass the cap.
      const [free] = await tx`
        select min(p)::int as position from generate_series(1, ${EVENT.cap}::int) p
        where p not in (select position from rsvps)`;
      if (free.position === null) throw new HttpError(409, 'full');
      position = free.position;
      await tx`
        insert into rsvps (email, name, role, has_car, position)
        values (${guest.email}, ${guest.name}, ${guest.role}, ${guest.hasCar}, ${position})`;
    }
    const [{ count }] = await tx`select count(*)::int as count from rsvps`;
    return { count, position, updated: !!existing };
  });

  sendInvite({ ...guest, position: result.position, updated: result.updated }); // in the background
  return result;
}));
