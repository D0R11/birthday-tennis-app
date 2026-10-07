// Guest list for the host: GET /api/admin/rsvps (JSON) or /api/admin/rsvps?format=csv
// Send the ADMIN_TOKEN as "Authorization: Bearer <token>".

import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { sql } from './db.js';
import { config } from './config.js';
import { sendRsvpEmail } from './email.js';

export const admin = Router();

function authorized(req) {
  if (!config.adminToken) return false;
  const given = Buffer.from((req.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(config.adminToken);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

admin.get('/admin/rsvps', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!sql) return res.status(503).json({ error: 'database_not_configured' });
  const rows = await sql`
    select status, position, name, email, role, has_car, created_at, updated_at from rsvps
    order by status = 'in' desc, position, updated_at`;
  if (req.query.format === 'csv') {
    const header = ['status', 'position', 'name', 'email', 'role', 'has_car', 'created_at', 'updated_at'];
    const lines = [header.join(','), ...rows.map((r) => header.map((k) => csvCell(r[k] instanceof Date ? r[k].toISOString() : r[k])).join(','))];
    res.type('text/csv').attachment('brawl-rsvps.csv').send(lines.join('\n') + '\n');
  } else {
    res.json({ count: rows.filter((r) => r.status === 'in').length, declined: rows.filter((r) => r.status === 'declined').length, rsvps: rows });
  }
});

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const label = (g) => `#${g.position} ${g.name}`;

// Emails one confirmed guest their calendar invite and marks it sent. Resolves true on success.
async function sendInvite(g) {
  const guest = { name: g.name, email: g.email, role: g.role, hasCar: g.has_car, position: g.position };
  const ok = await sendRsvpEmail('joined', guest, { inviteSeq: g.invite_seq });
  if (ok) await sql`update rsvps set invite_sent_at = now() where email = ${g.email} and status = 'in'`;
  return ok;
}

// 1 · Catch-up: email every confirmed guest whose invite_sent is false
// (for example, guests who RSVP'd before email was set up). Safe to run again: anyone sent is skipped.
//   POST /api/admin/send-invites          -> dry run: who would get one
//   POST /api/admin/send-invites?send=1   -> send them, one per second
admin.post('/admin/send-invites', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!sql) return res.status(503).json({ error: 'database_not_configured' });
  const pending = await sql`
    select email, name, role, has_car, position, invite_seq from rsvps
    where status = 'in' and not invite_sent order by position`;
  if (req.query.send !== '1') {
    return res.json({ dryRun: true, wouldSend: pending.length, guests: pending.map(label) });
  }
  const sent = [];
  const failed = [];
  for (const g of pending) {
    (await sendInvite(g) ? sent : failed).push(label(g));
    await pause(1100); // stay under the email service's rate limit
  }
  res.json({ sent: sent.length, failed: failed.length, sentTo: sent, failedFor: failed });
});

// 2 · One guest: email the invite to a single confirmed guest by email address,
// whether or not they've had one already (a resend).
//   POST /api/admin/send-invite   body: {"email": "friend@example.com"}
admin.post('/admin/send-invite', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!sql) return res.status(503).json({ error: 'database_not_configured' });
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) return res.status(400).json({ error: 'email_required' });
  const [g] = await sql`
    select email, name, role, has_car, position, invite_seq, status from rsvps where email = ${email}`;
  if (!g) return res.status(404).json({ error: 'not_found' });
  if (g.status !== 'in') return res.status(409).json({ error: 'not_confirmed', status: g.status });
  const ok = await sendInvite(g);
  res.status(ok ? 200 : 502).json({ sent: ok, guest: label(g) });
});
