# Architecture

## Tech stack

Versions live in `package.json`.

- **Next.js** (App Router, Turbopack) + **React** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Dexie.js** for IndexedDB (local-first storage)
- **Supabase** for auth (email OTP code), cloud sync, storage, and community catalog
- **Serwist** for PWA / service worker (configurator mode)
- **@dnd-kit/core + @dnd-kit/sortable** for drag-and-drop
- **motion** for animations
- **@zxing/browser** for barcode scanning
- **react-image-crop** for cover photo cropping
- **Vitest** for testing

## Project structure

The folders that matter; `src/app/` is the App Router, so its routes are the folder names.

```
src/
├── app/           # Next.js App Router pages
│   ├── page.tsx           # Home: the landing on a first visit, then the Kanban board
│   ├── accueil/           # The French landing again, for a returning user (Settings › À propos)
│   ├── en/                # English landing; en/privacy is the English privacy notice
│   ├── add/               # Add book (manual entry, barcode scan)
│   ├── book/[id]/         # Book detail & edit
│   ├── settings/          # Settings & backup
│   ├── confidentialite/   # Privacy notice (FR)
│   ├── share-target/      # Web Share Target: a shared title or URL pre-fills /add/manual
│   ├── api/               # keepalive and purge-covers, both called by Vercel Cron
│   └── ~offline/          # Offline fallback page
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks (useBooks, useBook and useBooksByStage in useBooks.ts; useIsMobile)
└── lib/           # Business logic, types, DB, constants
supabase/migrations/  # SQL migrations, applied by hand (see operations.md)
```

## Landing page

A first visit (no books, no stored entry) opens on the landing page: the promise, a real board screenshot, the four piles, and a quiet "open the app" button. Adding a first book, or entering the app, switches the device to the board for good; the landing stays at `/en` for English readers, with screenshots of the English interface.

`npm run screenshots -- fr|en` regenerates those screenshots, and the two phone frames embedded in the README, from a real production build seeded with `scripts/screenshot-seed.json` (instructions at the top of `scripts/capture-screenshots.mjs`). It also rewrites the README alt text of the phone frames from the seed file, so the README must keep embedding both `public/screenshots/` images.
