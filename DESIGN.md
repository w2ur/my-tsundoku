# DESIGN.md — My Tsundoku

This file is the project's documented identity. `design-tells` and `design-critique` read it, and
what it names is sanctioned there. Token values live in `src/app/globals.css` and
`contrast.test.ts` holds them to WCAG AA in both themes; this file says what each one is for.

Direction chosen 2026-10-10 (design audit, direction B "Promise first"): keep the established
identity, and change what fills the first screen. A first visit opens on a promise and a real
filled board, not on an empty board behind a modal.

## Read

Reading this as: a local-first book-collection app and its landing page, for French readers who
buy books faster than they read them, with a warm, bookish and quietly amused language.

## Domain

- The tsundoku itself: books bought and left unread, piling up
- The four piles, in order: to buy, the unread pile, the library, to part with
- Covers and spines, the material a shelf is actually made of
- The ISBN barcode on the back cover, scanned to fill in a book
- Moving a book from one pile to the next as it gets read, kept or sold
- A quotation about reading, pencilled into an empty shelf

## Colour world

Found in the subject:

- Page white, warm and slightly yellowed: the paper of an old book
- Dark bottle green: library cloth bindings, the green of a reading-room lamp shade
- Kraft amber: price tags, bookseller's paper bags, a leather bookmark
- Cream: endpapers and the inside of a dust jacket
- Near-black printing ink: the text on the page

Tokens (names as in `globals.css`):

| token | role | light | dark |
|---|---|---|---|
| `--paper` | page ground | `#FAF8F5` | `#1A2B24` |
| `--surface` | cards, raised panels | `#FFFFFF` | `#2E463C` |
| `--cream` | column and section tint | `#F5F0EB` | `#253A32` |
| `--ink` | body text | `#1a1a1a` | `#E8E2DB` |
| `--muted` / `--subtle` | secondary / tertiary text, full strength, never an opacity | `#415B4F` / `#556B61` | `#C1C0B9` / `#ADAFA8` |
| `--border-subtle` | rules, card borders | `#D8D3CB` | `#43584D` |
| `--forest` | the one action colour: the filled primary button, the wordmark and serif headings | `#2D4A3E` | `#E8E2DB` |
| `--amber` / `--amber-ink` | **the money piles only**: the glyphs of "À acheter" and "S'en séparer" (`STAGE_CONFIG`), and amber text tied to them | `#C4956A` / `#8F5D2A` | `#C4956A` / `#D4AD87` |

The warm paper ground is a named, owner-kept choice (it predates the portfolio's G1 rule and was
re-confirmed 2026-10-10), not a default. Dark is obtained by moving the ground into the green of
the bindings, not by inverting; amber stays. Light is the default and the theme is a per-device
Dexie setting with no `prefers-color-scheme` detection — the use scene is a phone in hand at a
bookshop or a shelf, where a stored choice beats a media query that would fight it on first paint.

**Amber rule:** amber means "money changes hands" — buying or parting with a book. It never marks
hierarchy, a link, a CTA or an active state. The two ink glyphs (Tsundoku, Bibliothèque) are the
piles you keep.

## Type

| role | family | why it fits the Read |
|---|---|---|
| display | Playfair Display, upright, regular weight | a book-jacket serif; the wordmark, the landing h1 and section heads |
| body | Inter | small UI text on a phone has to stay legible at 12–14px |
| quotations | Playfair Display italic | the empty-column quotes only (see Signature) |

The Playfair + Inter pair is the over-read pairing `design-tells` A1 names. It is kept on purpose:
it predates this file, the product is established in it, and changing it was not part of the
chosen direction.

Scale (px): 12 tab labels, footer, column headers · 14 body in cards and lists · 16 landing body ·
20 landing section heads · 24 wordmark · 32 landing h2 · 40 landing h1 on mobile, 56 at `md` and up.

Tracking: font defaults everywhere, except the landing h1 at `-0.01em` and the uppercase column
headers at `tracking-widest` (`0.1em`).

## Space & shape

Spacing scale (px): 4 icon to label · 8 inside controls · 16 between cards, page gutter on mobile ·
24 inside panels · 48 between landing sections · 96 above and below the hero.

| role | radius |
|---|---|
| controls (buttons, inputs) | 8px (`rounded-lg`) |
| surfaces / cards / columns | 12px (`rounded-xl`) |
| sheets and dialogs | 16px (`rounded-2xl`) |
| media (landing screenshots) | 8px, with a 1px `--border-subtle` hairline and no drawn chrome |
| badges, counts | full (`rounded-full`) — counts only, never buttons |

## Motion

| motion | how often a visitor sees it | duration | easing |
|---|---|---|---|
| hover colour change | every interaction | 150ms | ease |
| card drag and drop | every move | spring (motion library) | spring |
| sheet / dialog open | a few times per session | spring (motion library) | spring |
| landing | once per visit | none: the landing is present, not revealed | — |

Reduced motion: the CSS `prefers-reduced-motion` block removes transitions, and `MotionProvider`
(`MotionConfig reducedMotion="user"`) removes the springs. Both are needed.

## Signature

The four piles, in order, shown as a real filled board — used once, as the proof right under the
landing hero, because the board is the product and a first visitor should see it full before
being asked anything.

The italic Playfair quotation in each empty column is a separate, owner-sanctioned device
(2026-10-10: "they give personality to the product"). It is kept in all four columns even though
it repeats (C18) and is italic serif display (A0); it stays confined to empty columns and never
spreads to the landing, headings or buttons.

## Refused defaults

- A2 — refused; the h1 is upright and set in one style, emphasis comes from the wording
- R2 — refused; the board is shown as a real screenshot in a `<figure>`, never rebuilt from divs and never inside a drawn browser or phone frame
- B8 — refused; the landing does not end on four equal feature blocks: the hero leads, then the piles follow in their real order, each over a frame of that step
- C16 — refused; forest is the only filled action and appears once per screen, amber keeps its single meaning
- R8 — refused; buttons are 8px-radius rectangles, never pills
- A10 — refused; text uses the solid `--muted` / `--subtle` tokens, never `text-ink/NN` or `text-forest/NN`
- B9 — refused; no gradient, glass, glow or purple in the interface. Generated book covers (`GeneratedCover.tsx`) are content, not chrome: their hues, violet included, are owner-sanctioned (2026-10-10)

## References

| site | taken | refused |
|---|---|---|
| https://oku.club | one serif h1 (48px, weight 400) and one CTA as the only heavy items on the fold | its neutral grey ground and catalogue grid |
| https://joinbookwyrm.com/fr/ | real covers directly under the first CTA, in French | system-font h1 with no identity |
| https://cozyjournal.app | the reassurance line under a full-width mobile CTA | Inter display at 64px with tight negative tracking, a SaaS-landing voice |
| https://once.com/writebook | "open source, you get the code" next to the CTA, and real product frames per step | its 70px weight-800 display: too loud for a quiet reading tool |

Captures: `~/.claude/state/design-audit/2026-10-10/www.my-tsundoku.app/refs/` and `refs-gallery/`.

## Differs from

| neighbour | its direction in one line | axis this one differs on |
|---|---|---|
| william-revah-paris | warm paper, bistre accent, ink, a scanned handwriting face | signature (product-proof board vs. the hand) and type family |
| pogofish | black ink on warm paper, vermilion, Instrument Serif + Newsreader + mono figures | type family and accent hue |
| ecritoire | "Encre": warm paper, ink, oxblood, Inter + Newsreader, light-only | type family (display serif) and layout structure (board app) |
| bas-de-laine | warm cream, sage green, terracotta | accent (forest + amber, no terracotta) and signature |
| belle-forme | cream, muted blue accent, Jost + Playfair | body family (Inter), accent hue, signature |
| elenchus-web | the Untilt house shell, teal accent | ground and type family |
| palimpseste-nacre-ultime | Literata text, system UI chrome, no cream | ground and type family |
| localhost | dark psychedelic, deep space, CRT phosphor | ground |

Convergence: the warm paper ground is shared with four neighbours. It is kept because it is this
project's established, owner-confirmed identity; what sets My Tsundoku apart is what fills the
first screen — a real board of covers in forest and amber — not a new palette.
