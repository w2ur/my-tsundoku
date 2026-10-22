---
name: "My Tsundoku"
tagline_fr: "Votre tsundoku, de l’envie à la bibliothèque"
tagline_en: "Your tsundoku, from wishlist to library"
about_en: "A bilingual (FR/EN) offline-first PWA for organizing personal book collections on a Kanban board."
facts_fr: "Next.js 16, local-first sur IndexedDB, synchro Supabase, PWA hors ligne."
facts_en: "Next.js 16, local-first on IndexedDB, Supabase sync, offline PWA."
---

# Tsundoku

Tsundoku (積ん読) is a PWA for organizing personal book collections. Inspired by the Japanese concept of letting unread books pile up, it provides a Kanban-style board to track books across four stages: wishlist, unread pile, library, and to sell. Available in French and English, with light and dark mode. Works offline with local-first storage — optionally sign in to sync across devices and contribute to the community book catalog.

![Add-a-book screen in French (Ajouter un livre), asking which stage the book goes to: Livres à acheter, Tsundoku, Bibliothèque or S'en séparer](public/screenshots/screenshot-add.png)
![Kanban board in French with the Livres à acheter (wishlist) tab selected next to the Tsundoku, Bibliothèque and S'en séparer tabs, showing three books](public/screenshots/screenshot-board.png)

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Dexie.js** for IndexedDB (local-first storage)
- **Supabase** for auth (email OTP code), cloud sync, storage, and community catalog
- **Serwist** for PWA / service worker (configurator mode)
- **@dnd-kit/core + @dnd-kit/sortable** for drag-and-drop
- **motion** for animations
- **@zxing/browser** for barcode scanning
- **react-image-crop** for cover photo cropping
- **Vitest** for testing

## Running Locally

```bash
cp .env.example .env.local   # fill in your Supabase credentials
npm install
npm run dev
```

Open [http://localhost:9876](http://localhost:9876).

A first visit (no books, no stored entry) opens on the landing page: the promise, a real board screenshot, the four piles, and a quiet "open the app" button. Adding a first book, or entering the app, switches the device to the board for good; the landing stays at `/en` for English readers, with screenshots of the English interface (`npm run screenshots -- fr|en` regenerates them).

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `CRON_SECRET` | Bearer secret Vercel Cron sends to `/api/keepalive` and `/api/purge-covers`. Without it keepalive still pings (flagged unauthenticated) and purge-covers refuses to run |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, Vercel Production only: `/api/purge-covers` deletes queued cover files through the Storage API |

Apply `supabase/migrations/*.sql` in numeric order in the Supabase SQL editor, reading each file's BEFORE APPLYING header first (008 has pre-checks).

### Build

```bash
npm run build    # next build && serwist build
```

### Tests

```bash
npm test           # single run
npm run test:watch # watch mode
```

## Project Structure

```
src/
├── app/           # Next.js App Router pages
│   ├── page.tsx           # Home — Kanban board
│   ├── add/               # Add book (manual entry, barcode scan)
│   ├── book/[id]/         # Book detail & edit
│   ├── settings/          # Settings & backup
│   ├── confidentialite/   # Privacy notice (FR); /en/privacy is the English one
│   └── ~offline/          # Offline fallback page
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks (useBooks, useBook, useBooksByStage, useIsMobile)
└── lib/           # Business logic, types, DB, constants
```

## Roadmap

Planned features (in no particular order):

- **Sort your piles** — Order a column by author, title or date added
- **Pile statistics** — See how fast your pile grows, and how long your books have been waiting
- **Find in a bookshop** — Reach the books you mean to buy at your bookshop, in one tap

Have a suggestion? [Get in touch](mailto:contact@my-tsundoku.app).

## Deployment

Auto-deployed on **Vercel** on push to `main`.

Retention: a book deleted more than 30 days ago is stripped of its content nightly (pg_cron, migration `007_purge_soft_deleted.sql`, which must be applied in the Supabase SQL editor before the code that reads `purged_at` is deployed); its cover files are deleted by the daily `/api/purge-covers` Vercel cron.

- **URL**: https://www.my-tsundoku.app

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

Commercial licensing available — contact [w@revah.paris](mailto:w@revah.paris).

## Author

Made with care by [William](https://william.revah.paris)
