# CLAUDE.md — Tsundoku

## Project Overview

Tsundoku is a PWA for organizing personal book collections using a Kanban-style board. Users manage books across four stages: wishlist, unread pile (tsundoku), library, and to sell. Books can be added manually or via barcode scanning (ISBN lookup via Open Library). Available in French (default) and English, with light and dark mode support.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Dexie.js (IndexedDB) — local-first, all data stored client-side
- **Cloud**: Supabase (Auth, Postgres, Storage) — OTP code auth, cloud sync, community catalog
- **PWA**: Serwist (configurator mode) — `serwist.config.js` + `serwist build` post-step
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable (stable v5/v6)
- **Animations**: motion
- **Barcode Scanning**: html5-qrcode
- **Image Cropping**: react-image-crop
- **Testing**: Vitest + @testing-library/react

## User-Facing Language

French (default) and English. Users switch language in Settings > Preferences. All UI strings use the `useTranslation()` hook from `src/lib/preferences.tsx`.

## Development

```bash
npm install
npm run dev        # Start dev server on port 9876 (Turbopack)
npm run build      # next build && serwist build
npm test           # Run tests (vitest)
npm run test:watch # Run tests in watch mode
```

Environment variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable (anon) key

## Project Structure

- `src/lib/` — types, db, books CRUD, constants, open-library, backup, quotes, roadmap, changelog, search, swipe, preferences, supabase, auth, sync, covers, account, community-search, isbn
- `src/lib/i18n/` — translation dictionaries (fr.ts canonical, en.ts), locale types, plural helper
- `src/hooks/` — useBooks, useBook, useBooksByStage (Dexie live queries), useIsMobile
- `src/components/` — reusable UI components
- `src/app/` — routes: `/`, `/add/`, `/add/scan`, `/add/manual`, `/book/[id]`, `/settings`, `/~offline`
- `src/app/sw.ts` — service worker (excluded from tsconfig, compiled by Serwist CLI)
- `supabase/migrations/` — SQL migration files for Supabase schema

## Testing

- **Framework**: Vitest with jsdom environment
- **Convention**: test files live next to source (`foo.ts` → `foo.test.ts`)
- **Priority**: utility functions, data transformations, business logic

## Build Warning Exceptions

None currently. Build must produce zero warnings.

## License

AGPL-3.0-only. Commercial licensing available — contact w@revah.paris.

## Deployment

- **Platform**: Vercel (auto-deploy on push to main)
- **URL**: https://www.my-tsundoku.app

## Project-Specific Rules

- `sw.ts` is excluded from `tsconfig.json` (uses webworker types, compiled separately by Serwist CLI)
- Serwist must use configurator mode, not `withSerwistInit` wrapper (Next.js 16/Turbopack compat)
- Build command: `next build && serwist build`
- Dexie SSR guard: `typeof window !== 'undefined'`
- Supabase SSR guard: `supabase` client is `null` on server (same pattern as Dexie)
- Sync is local-first: Dexie remains source of truth, Supabase is backup/sync layer
- Community catalog contributions are anonymous — `community_books` has no `user_id`
- Cover strategy: OL URL > user photo (cropped, max 400px JPEG) > generated SVG. Community catalog uses generated covers only
- Theme colors: paper `#FAF8F5`, forest `#2D4A3E`, amber `#C4956A`, cream `#F5F0EB`. Dark mode overrides via `[data-theme="dark"]` in globals.css
- i18n: homegrown, no dependencies. `fr.ts` defines canonical shape, `en.ts` satisfies `Record<TranslationKeys, string>`. Use `useTranslation()` hook for all UI strings. Light mode and French are defaults — no system preference detection
- Content files (quotes, roadmap, changelog) are locale-indexed separately from the translation dictionary
- Fonts: Playfair Display (serif), Inter (sans)
- Bump the version in `package.json` (semver) when a commit changes user-facing behavior. Add a matching entry in `src/lib/changelog.ts`. Internal changes (refactors, tests, docs) don't trigger a bump.
