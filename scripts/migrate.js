// Applies migrations/NNN_*.sql in order, each once. Runs before every Railway deploy.
import { readdir, readFile } from 'node:fs/promises';
import { sql } from '../server/db.js';

const dir = new URL('../migrations/', import.meta.url);

if (!sql) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

try {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(71)`; // one migrator at a time
    await tx`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    await tx`alter table schema_migrations enable row level security`;
    const done = new Set((await tx`select name from schema_migrations`).map((r) => r.name));
    const files = (await readdir(dir)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      await tx.unsafe(await readFile(new URL(file, dir), 'utf8'));
      await tx`insert into schema_migrations (name) values (${file})`;
      console.log(`applied ${file}`);
    }
  });
  console.log('migrations up to date');
} catch (err) {
  console.error('migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
