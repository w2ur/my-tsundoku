# Operations

## Environment variables

Copy `.env.example` to `.env.local` and fill it in.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `CRON_SECRET` | Bearer secret Vercel Cron sends to `/api/keepalive` and `/api/purge-covers`. Without it keepalive still pings (flagged unauthenticated) and purge-covers refuses to run |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, Vercel Production only: `/api/purge-covers` deletes queued cover files through the Storage API |

## Database migrations

Apply `supabase/migrations/*.sql` in numeric order in the Supabase SQL editor, reading each file's BEFORE APPLYING header first (008 has pre-checks).

## Build and tests

```bash
npm run build      # next build && serwist build
npm test           # single run
npm run test:watch # watch mode
```

## Deployment

Auto-deployed on **Vercel** on push to `main`, at https://www.my-tsundoku.app. `vercel.json` declares the crons that call `/api/keepalive` and `/api/purge-covers`.

## Retention

A book deleted more than 30 days ago is stripped of its content nightly (pg_cron, migration `007_purge_soft_deleted.sql`, which must be applied in the Supabase SQL editor before the code that reads `purged_at` is deployed); its cover files are deleted by the daily `/api/purge-covers` Vercel cron.
