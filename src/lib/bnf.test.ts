import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeBnfTitle, normalizeBnfAuthor, parseBnfResponse, lookupIsbn } from "./bnf";

// Mirrors the real SRU envelope: the dc namespace is declared on an inner
// element, which is why parsing reads by namespace rather than by prefix.
function sruResponse(inner: string, records = 1): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
<srw:numberOfRecords>${records}</srw:numberOfRecords>
<srw:records><srw:record><srw:recordData>
<oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/">
${inner}
</oai_dc:dc>
</srw:recordData></srw:record></srw:records>
</srw:searchRetrieveResponse>`;
}

afterEach(() => vi.unstubAllGlobals());

describe("normalizeBnfTitle", () => {
  it("drops the statement of responsibility after a slash", () => {
    expect(normalizeBnfTitle("Jacaranda : roman / Gaël Faye")).toBe("Jacaranda");
  });

  it("drops bracketed edition notes", () => {
    expect(normalizeBnfTitle("Houris : roman ([Éd.] en grands caractères)")).toBe("Houris");
  });

  it("leaves a plain title untouched", () => {
    expect(normalizeBnfTitle("Triste tigre")).toBe("Triste tigre");
  });

  it("keeps every work in an omnibus rather than silently picking one", () => {
    expect(
      normalizeBnfTitle("La place ; Passion simple ; Les années ([Éd. en gros caractères])"),
    ).toBe("La place ; Passion simple ; Les années");
  });

  it("strips a trailing author name that carries no slash separator", () => {
    // Real record shape: BnF appends the author with no " / " before it.
    expect(
      normalizeBnfTitle(
        "La place ; Passion simple ; Les années ([Éd. en gros caractères]) Annie Ernaux",
        "Annie Ernaux",
      ),
    ).toBe("La place ; Passion simple ; Les années");
  });

  it("control: without the author it cannot know where the title ends", () => {
    // Guards the test above from passing for the wrong reason. If this ever
    // starts returning the clean title, the author argument has stopped
    // carrying the behaviour and the assertion above proves nothing.
    expect(
      normalizeBnfTitle(
        "La place ; Passion simple ; Les années ([Éd. en gros caractères]) Annie Ernaux",
      ),
    ).toBe("La place ; Passion simple ; Les années Annie Ernaux");
  });

  it("leaves the title alone when the author does not appear at the end", () => {
    expect(normalizeBnfTitle("Annie Ernaux, une oeuvre", "Annie Ernaux")).toBe(
      "Annie Ernaux, une oeuvre",
    );
  });
});

describe("normalizeBnfAuthor", () => {
  it("strips life dates and the role suffix, and swaps surname order", () => {
    expect(normalizeBnfAuthor("Faye, Gaël (1982-....). Auteur du texte / Autrice du texte")).toBe(
      "Gaël Faye",
    );
    expect(normalizeBnfAuthor("Sinno, Neige (1977-....). Auteur du texte")).toBe("Neige Sinno");
  });

  it("leaves a single-token name alone", () => {
    expect(normalizeBnfAuthor("Colette (1873-1954). Auteur du texte")).toBe("Colette");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeBnfAuthor("")).toBe("");
  });
});

describe("parseBnfResponse", () => {
  it("reads title and creator by namespace and reports no cover", () => {
    const xml = sruResponse(
      `<dc:title>Jacaranda : roman / Gaël Faye</dc:title>
       <dc:creator>Faye, Gaël (1982-....). Auteur du texte</dc:creator>`,
    );
    expect(parseBnfResponse(xml, "9782378288679")).toEqual({
      title: "Jacaranda",
      author: "Gaël Faye",
      coverUrl: "",
      isbn: "9782378288679",
    });
  });

  it("returns a result with an empty author when dc:creator is absent", () => {
    const xml = sruResponse(`<dc:title>Houris : roman</dc:title>`);
    expect(parseBnfResponse(xml, "9791026907848")?.author).toBe("");
  });

  it("returns null when there is no title", () => {
    expect(parseBnfResponse(sruResponse(`<dc:date>2023</dc:date>`), "123")).toBeNull();
  });

  it("returns null for malformed XML", () => {
    expect(parseBnfResponse("<not xml", "123")).toBeNull();
  });
});

describe("parseBnfResponse against responses captured from the live API", () => {
  // Public catalogue records, fetched 2026-08-03. They carry a default xmlns on
  // the root and cataloguing apparatus that hand-written fixtures do not, which
  // is the whole reason for keeping them.
  // Resolved from the project root: under the jsdom environment import.meta.url
  // is not a file:// URL, so it cannot be used as a base here.
  function fixture(name: string): string {
    return readFileSync(`src/lib/__fixtures__/bnf-${name}.xml`, "utf8");
  }

  it("parses a book Open Library has no record of", () => {
    expect(parseBnfResponse(fixture("jacaranda"), "9782378288679")).toEqual({
      title: "Jacaranda",
      author: "Gaël Faye",
      coverUrl: "",
      isbn: "9782378288679",
    });
  });

  it("parses an omnibus without swallowing the author into the title", () => {
    const result = parseBnfResponse(fixture("ernaux-omnibus"), "9791026906308");
    expect(result?.title).toBe("La place ; Passion simple ; Les années");
    expect(result?.author).toBe("Annie Ernaux");
  });
});

describe("lookupIsbn", () => {
  it("returns null and does not throw when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(lookupIsbn("9782378288679")).resolves.toBeNull();
  });

  it("returns null on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(lookupIsbn("9782378288679")).resolves.toBeNull();
  });

  it("sends the ISBN as a CQL isbn query and strips anything not ISBN-shaped", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => sruResponse(`<dc:title>Triste tigre</dc:title>`),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupIsbn('978237828650"7');

    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(decodeURIComponent(requestedUrl)).toContain('bib.isbn all "9782378286507"');
    expect(requestedUrl).not.toContain("%22%2C"); // no injected quote survived
    expect(result?.title).toBe("Triste tigre");
  });
});
