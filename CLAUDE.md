# CLAUDE.md — Tsundoku

## Project Overview

Tsundoku is a PWA for organizing personal book collections using a Kanban-style board. Users manage books across four stages: wishlist, unread pile (tsundoku), library, and to sell. Books can be added manually or via barcode scanning (ISBN lookup via Open Library). Available in French (default) and English, with light and dark mode support.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Dexie.js (IndexedDB) — local-first, all data stored client-side
- **Cloud**: Supabase (Auth, Postgres, Storage) — OTP code auth, cloud sync, community catalog
- **PWA**: Serwist (configurator mode) — `serwist.config.js` + `serwist build` post-step
- **Drag & Drop**: @dnd-kit/core ^6.3.1 + @dnd-kit/sortable ^10.0.0
- **Animations**: motion
- **Barcode Scanning**: @zxing/browser
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

- `src/lib/` — types, db, books CRUD, constants, open-library, bnf, book-lookup, duplicates, backup, quotes, roadmap, changelog, search, swipe, preferences, supabase, auth, sync, covers, account, community-search, isbn
- `src/lib/i18n/` — translation dictionaries (fr.ts canonical, en.ts), locale types, plural helper
- `src/hooks/` — useBooks, useBook, useBooksByStage (Dexie live queries), useIsMobile
- `src/components/` — reusable UI components
- `src/app/` — routes: `/`, `/en`, `/add/`, `/add/scan`, `/add/manual`, `/book/[id]`, `/settings`, `/~offline`, `/share-target`
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
- Book ids are client-minted strings, not uuids. `addBook` uses uuidv4, but `importBooks` preserves whatever ids the imported file carries, so any format can reach the cloud. `books.id` is therefore `text` (migration 004) — do not narrow it back to `uuid`: a non-uuid id makes Postgres reject the row with 22P02, a permanent 400 that strands the book on one device forever
- ISBN lookup is Open Library first, BnF second (`src/lib/book-lookup.ts`). Open Library returns JSON and cover images; BnF has legal-deposit coverage of French publishing that Open Library lacks — measured 2026-08-03, it resolved every French ISBN Open Library missed — but returns no covers and titles carrying cataloguing apparatus (`"Houris : roman ([Éd.] en grands caractères)"`), which is what `normalizeBnfTitle`/`normalizeBnfAuthor` exist to strip. `normalizeBnfTitle` needs `dc:creator` passed in: BnF does not always separate the statement of responsibility with `" / "`, so the only way to know `"… Les années ([Éd. en gros caractères]) Annie Ernaux"` ends at "années" is that the tail equals the creator. Do not promote BnF to primary, and do not add it to the title-search path without measuring first — its relevance ranking is poor (searching "boussole enard" returns a critical essay before the novel)
- `bnf.test.ts` asserts against SRU responses captured from the live API in `src/lib/__fixtures__/`, not only hand-written XML. The real records exposed the trailing-author case the synthetic ones hid. Keep both: the synthetic envelope covers the error paths, the captured one covers reality
- BnF responses are deliberately left cacheable by the service worker, unlike Supabase reads. Catalogue records are immutable, so a stale one is harmless — the `isSupabaseApiRequest` guard exists because a stale *pull* advances the sync cursor past unapplied rows, which has no analogue here
- Duplicate detection (`src/lib/duplicates.ts`) is exact, never fuzzy: it matches on canonical ISBN-13 or on accent- and punctuation-stripped title **and** author. It is advisory and never blocks adding, so a false positive is worse than a miss. `BookForm` takes `excludeBookId` for the same reason — in edit mode the book being edited must not be reported as a duplicate of itself
- Cover strategy: OL URL > user photo (cropped, max 400px JPEG) > generated SVG. Community catalog uses generated covers only
- Theme colors: paper `#FAF8F5`, forest `#2D4A3E`, amber `#C4956A`, cream `#F5F0EB`. Dark mode overrides via `[data-theme="dark"]` in globals.css
- **Text color is a solid semantic token, never an opacity of forest.** Use `text-ink` (primary), `text-muted` (secondary), `text-subtle` (tertiary/placeholder), `text-faint` (decorative only — bullets, separators), `text-amber-ink` (amber as text or meaningful icon), `text-danger` (destructive/error). `text-forest/NN` for text is banned: composited on paper that scale ran 1.68:1–4.07:1, so every tier failed WCAG AA — the author line on each book card sat at 2.53:1. Alpha also cannot be tuned per theme, which is why light mode used to be the weaker of the two. `bg-forest/NN` and `border-forest/NN` for decorative fills are still fine; card boundaries use `border-border-subtle` / `border-border-strong`
- `contrast.test.ts` parses globals.css and asserts every token ≥4.5:1 against paper/surface/cream in **both** themes (`--faint` at the 3:1 non-text bar). Adding or retuning a token means it has to clear that test, which also carries a control asserting the replaced colors still fail
- Stage glyphs are SVG in `StageIcon.tsx`, not emoji. `STAGE_CONFIG` deliberately has no `emoji` field: it was the only label on the mobile tab bar, where 📚/📖 were indistinguishable. `StageTabs` stacks icon over label so the full "Livres à acheter" fits a ~93px tab
- Keyboard focus comes from one global `:focus-visible` rule in globals.css. Do not add `focus:outline-none` without an equally visible replacement
- Reduced motion needs both layers: the CSS `prefers-reduced-motion` block covers transitions/animations, and `MotionProvider` (`MotionConfig reducedMotion="user"`) covers the motion library's JS springs. CSS alone does not reach them
- i18n: homegrown, no dependencies. `fr.ts` defines canonical shape, `en.ts` satisfies `Record<TranslationKeys, string>`. Use `useTranslation()` hook for all UI strings. Light mode and French are defaults — no system preference detection
- Content files (quotes, roadmap, changelog) are locale-indexed separately from the translation dictionary
- Fonts: Playfair Display (serif), Inter (sans)
- Bump the version in `package.json` (semver) when a commit changes user-facing behavior. Add a matching entry in `src/lib/changelog.ts`. Internal changes (refactors, tests, docs) don't trigger a bump.
- Supabase free tier auto-pauses projects after ~7 days of inactivity. A daily Vercel Cron (`vercel.json` → `/api/keepalive`) reads one row from `community_books` to keep the project active. `CRON_SECRET` on Vercel (Production scope only — preview deployments never run crons) authenticates the call; if it is missing or empty the route still pings and reports `authenticated: false`, because a strict check would reject Vercel's own scheduler (it sends no usable header without a secret) and silently disable the keepalive.
