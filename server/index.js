import express from 'express';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { sql } from './db.js';
import { buildIcs } from './event.js';
import { rsvps } from './rsvps.js';
import { admin } from './admin.js';

const publicDir = fileURLToPath(new URL('../public', import.meta.url));
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // Railway's proxy: use the guest's real IP for rate limiting
app.use(express.json({ limit: '10kb' }));

// Health check, also used by the daily keep-alive so the free Supabase project doesn't pause.
app.get('/api/health', async (_req, res) => {
  if (!sql) return res.status(503).json({ ok: false, error: 'database_not_configured' });
  try {
    await sql`select 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, error: 'database_unreachable' });
  }
});

app.use('/api', rsvps, admin);
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

// REMIND ME: the "add to calendar" file, built from server/event.js.
app.get('/event.ics', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('text/calendar; charset=utf-8').send(buildIcs({ method: 'PUBLISH', url: config.publicUrl }));
});

app.use(express.static(publicDir, {
  setHeaders(res, filePath) {
    // The page and service worker must revalidate so installed PWAs pick up new versions.
    if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(filePath)) res.set('Cache-Control', 'no-cache');
  },
}));

app.listen(config.port, () => {
  console.log(`Brawl server on http://localhost:${config.port}${sql ? '' : ' (no DATABASE_URL: API disabled)'}`);
});
