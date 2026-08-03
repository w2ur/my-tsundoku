-- Widen books.id from uuid to text.
--
-- Book ids are minted client-side and Book.id is typed `string`: books added in
-- the app get uuidv4 (src/lib/books.ts), but importBooks preserves whatever ids
-- the imported file carries. A real import used synthetic keys of the form
-- "w-reco-2026-07-13-000", and every push of those 344 books was rejected with
-- 22P02 "invalid input syntax for type uuid" — a hard 400, retried forever and
-- never satisfiable, leaving them local-only on a single device.
--
-- Dexie is the source of truth in this app, so the cloud schema follows it
-- rather than the other way round. Nothing references books.id (no foreign
-- keys point at it), so the PK type can change in place. Existing uuid values
-- cast to their canonical lowercase hyphenated text form, which is exactly what
-- the client already sends for uuid-keyed books — so rows keep matching on
-- upsert and no client change is needed.

ALTER TABLE books ALTER COLUMN id TYPE text;
