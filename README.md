# Bradly's Birthday Brawl

RSVP site for Bradly's birthday tennis outing: Sat, Oct 24, 11 AM–10 PM, Tenisu, Cuenca, Batangas.

- **Front end:** a vanilla-JS PWA in `public/`, with no build step.
- **Back end:** Express in `server/`.
- **Database:** Supabase Postgres.
- **Email:** calendar invites sent through Amazon SES.
- **Hosting:** Railway.

## Layout

| Path | What |
|---|---|
| `public/` | The site: page, styles (`tokens.css` holds the design tokens), game, service worker, manifest, sprites, icons |
| `server/index.js` | Express app: static files, `/event.ics`, `/api/*` |
| `server/event.js` | Event facts (date, time, place, cap, deadline) and the `.ics` builder |
| `server/rsvps.js` | `GET /api/rsvps`, `POST /api/rsvps/lookup`, `POST /api/rsvps` (join or edit), `POST /api/rsvps/decline` ("can't make it") |
| `server/admin.js` | `GET /api/admin/rsvps[?format=csv]`, with `Authorization: Bearer $ADMIN_TOKEN` |
| `server/email.js` | Joined, changed and declined emails via SES (with calendar invite or cancellation); skipped when SES isn't configured |
| `migrations/` | Numbered SQL files, applied in order by `npm run migrate` |

## Run locally

```bash
npm install
cp .env.example .env    # then fill in DATABASE_URL (Supabase brawl-dev) and the rest
npm run migrate
npm run dev             # http://localhost:3000
```

Without `DATABASE_URL`, the site still loads but the API returns 503. To test the deadline states, set `TODAY_OVERRIDE=2026-10-16` in `.env`; it's ignored in production.

## First-time setup

Start the slow steps first: SES approval and DNS changes take time.

1. **Domain:** buy one, from Cloudflare Registrar or Porkbun.
2. **Amazon SES** (region ap-southeast-1, Singapore):
   1. Verify the domain with Easy DKIM, then add its 3 CNAME records and a `_dmarc` TXT record at the registrar.
   2. Request production access. Until it's approved, SES only sends to addresses you've verified.
   3. Create an IAM user allowed only `ses:SendEmail` and `ses:SendRawEmail`, and create an access key for it.
3. **Supabase:**
   1. Create projects `brawl` and `brawl-dev`, both in the Singapore region.
   2. For each, copy the **Session pooler** connection string (Connect, then Session pooler).
4. **GitHub:** create a private repo and push `main`.
5. **Railway:**
   1. New project from the GitHub repo, region Singapore.
   2. Start command `npm start`; pre-deploy command `npm run migrate`.
   3. Variables: everything in `.env.example`, with `DATABASE_URL` set to the `brawl` (production) pooler URI and `PUBLIC_URL=https://<your domain>`.
   4. Generate a Railway domain and test there first. Then add your custom domain and create the CNAME record Railway shows.
6. **Keep Supabase awake:** free projects pause after about a week without activity. Add a daily job, e.g. a Railway cron service on `0 0 * * *` running `curl -fsS https://<domain>/api/health`.
7. **Go live:** RSVP once yourself and check the invite email. Then delete the test row in Supabase's Table Editor and share the link.

## Changing things later

- **Event details:** edit `server/event.js` and increase `sequence`, so calendars replace the old event. Update the matching copy in `public/index.html` and the dates in `public/app.js`.
- **Front-end changes:** bump `CACHE` in `public/sw.js`, so installed apps pick up the new files.
- **Database changes:** add `migrations/00N_name.sql`. Railway applies it before the next deploy.
- **Guest list:** use Supabase's Table Editor, or run `curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<domain>/api/admin/rsvps?format=csv`.
