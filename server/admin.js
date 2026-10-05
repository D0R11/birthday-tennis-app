// Guest list for the host: GET /api/admin/rsvps (JSON) or /api/admin/rsvps?format=csv
// Send the ADMIN_TOKEN as "Authorization: Bearer <token>".

import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { sql } from './db.js';
import { config } from './config.js';

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
