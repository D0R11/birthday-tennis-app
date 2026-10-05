import postgres from 'postgres';
import { config } from './config.js';

// Supabase's Session pooler needs TLS; a local Postgres doesn't.
function sslFor(url) {
  const host = new URL(url).hostname;
  return host === 'localhost' || host === '127.0.0.1' ? false : 'require';
}

export const sql = config.databaseUrl
  ? postgres(config.databaseUrl, {
    ssl: sslFor(config.databaseUrl),
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  })
  : null;
