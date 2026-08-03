import type { OpenLibraryResult } from "./open-library";

const BNF_SRU_ENDPOINT = "https://catalogue.bnf.fr/api/SRU";
const DC_NAMESPACE = "http://purl.org/dc/elements/1.1/";

// Roles BnF appends to a creator name: "Faye, Gaël (1982-....). Auteur du texte".
const ROLE_SUFFIX =
  /\.\s*(Auteur|Autrice|Éditeur|Editeur|Traducteur|Traductrice|Illustrateur|Illustratrice|Préfacier|Prefacier)\b.*$/i;

/**
 * BnF titles carry cataloguing apparatus the user never wants to see:
 * a statement of responsibility ("… / Gaël Faye"), bracketed edition notes
 * ("([Éd.] en grands caractères)") and a genre subtitle (": roman").
 *
 * Omnibus titles ("La place ; Passion simple ; Les années") are deliberately
 * kept whole. Picking the first work would name the wrong book about as often
 * as the right one, and the user can edit the field.
 *
 * `author` is optional but should be passed when known: BnF does not always
 * separate the statement of responsibility with " / ". A real record reads
 * "La place ; Passion simple ; Les années ([Éd. en gros caractères]) Annie
 * Ernaux", where the only way to know "Annie Ernaux" is not part of the title
 * is that it equals dc:creator.
 */
export function normalizeBnfTitle(raw: string, author = ""): string {
  let title = raw;

  const responsibility = title.indexOf(" / ");
  if (responsibility !== -1) title = title.slice(0, responsibility);

  title = title.replace(/\([^()]*\)/g, " ").replace(/\[[^[\]]*\]/g, " ");
  title = title.replace(/\s+/g, " ").trim();

  if (author) {
    const escaped = author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title.replace(new RegExp(`\\s*${escaped}\\s*$`, "i"), "");
  }

  title = title.replace(
    /\s*:\s*(roman|récit|récits|recit|recits|nouvelles|essai|poésie|poemes|poèmes)\s*$/i,
    "",
  );

  return title
    .replace(/\s+/g, " ")
    .replace(/[\s:;,./-]+$/, "")
    .trim();
}

/** "Faye, Gaël (1982-....). Auteur du texte" → "Gaël Faye". */
export function normalizeBnfAuthor(raw: string): string {
  let author = raw;

  const dates = author.indexOf("(");
  if (dates !== -1) author = author.slice(0, dates);

  const alternateRole = author.indexOf(" / ");
  if (alternateRole !== -1) author = author.slice(0, alternateRole);

  author = author
    .replace(ROLE_SUFFIX, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;\s]+$/, "")
    .trim();

  const comma = author.indexOf(",");
  if (comma === -1) return author;

  const surname = author.slice(0, comma).trim();
  const forename = author.slice(comma + 1).trim();
  return forename ? `${forename} ${surname}` : surname;
}

export function parseBnfResponse(xml: string, isbn: string): OpenLibraryResult | null {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, "text/xml");
  } catch {
    return null;
  }
  if (doc.getElementsByTagName("parsererror").length > 0) return null;

  // Read by namespace rather than by the "dc:" prefix, so an upstream prefix
  // change surfaces as a miss we can see rather than a silent parse of nothing.
  const rawTitle = doc.getElementsByTagNameNS(DC_NAMESPACE, "title")[0]?.textContent ?? "";
  const rawAuthor = doc.getElementsByTagNameNS(DC_NAMESPACE, "creator")[0]?.textContent ?? "";

  // Author first: the title normalizer needs it to recognise a trailing
  // statement of responsibility that carries no " / " separator.
  const author = normalizeBnfAuthor(rawAuthor.replace(/\s+/g, " ").trim());
  const title = normalizeBnfTitle(rawTitle.replace(/\s+/g, " ").trim(), author);
  if (!title) return null;

  return {
    title,
    author,
    // BnF publishes no cover images. GeneratedCover handles the empty case.
    coverUrl: "",
    isbn,
  };
}

/**
 * Looks an ISBN up in the French national library catalogue via its SRU API.
 * Used only as a fallback: BnF has legal-deposit coverage of French publishing
 * that Open Library lacks, but returns no covers and dirtier metadata.
 *
 * Never throws — every failure mode is a null so the caller can fall through.
 */
export async function lookupIsbn(isbn: string): Promise<OpenLibraryResult | null> {
  // The ISBN is interpolated into a CQL string, so anything that could close
  // the quote is removed first — same reasoning as sanitizeCommunitySearchTerm.
  const safeIsbn = isbn.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (!safeIsbn) return null;

  const query = encodeURIComponent(`bib.isbn all "${safeIsbn}"`);
  const url =
    `${BNF_SRU_ENDPOINT}?version=1.2&operation=searchRetrieve` +
    `&query=${query}&recordSchema=dublincore&maximumRecords=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return parseBnfResponse(await res.text(), safeIsbn);
  } catch {
    return null;
  }
}
