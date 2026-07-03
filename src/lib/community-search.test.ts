import { describe, it, expect, vi } from "vitest";
import { deduplicateResults, sanitizeCommunitySearchTerm } from "./community-search";

vi.mock("./supabase", () => ({ supabase: null }));

describe("deduplicateResults", () => {
  it("removes community results that match OL results by ISBN", () => {
    const ol = [{ title: "Book A", author: "Author", coverUrl: "", isbn: "123", olWorkId: "/works/1" }];
    const community = [{ id: "c1", title: "Book A", author: "Author", isbn: "123", contributed_at: "2024-01-01" }];
    const result = deduplicateResults(ol, community);
    expect(result.community).toHaveLength(0);
  });

  it("removes community results that match OL results by title+author", () => {
    const ol = [{ title: "Book A", author: "Author X", coverUrl: "", olWorkId: "/works/1" }];
    const community = [{ id: "c2", title: "book a", author: "author x", isbn: null, contributed_at: "2024-01-01" }];
    const result = deduplicateResults(ol, community);
    expect(result.community).toHaveLength(0);
  });

  it("keeps community results with no OL match", () => {
    const ol = [{ title: "Book A", author: "Author", coverUrl: "", olWorkId: "/works/1" }];
    const community = [{ id: "c3", title: "Obscure Book", author: "Unknown", isbn: null, contributed_at: "2024-01-01" }];
    const result = deduplicateResults(ol, community);
    expect(result.community).toHaveLength(1);
  });
});

// ============================================================
// sanitizeCommunitySearchTerm
// ============================================================
// Regression: raw query was interpolated into a PostgREST .or() filter;
// commas, parens, and LIKE wildcards broke the query silently (error swallowed).

describe("sanitizeCommunitySearchTerm", () => {
  it("strips commas that break PostgREST .or() syntax", () => {
    expect(sanitizeCommunitySearchTerm("Tolkien, J.R.R.")).toBe("Tolkien J.R.R.");
  });

  it("strips percent signs that act as SQL LIKE wildcards", () => {
    expect(sanitizeCommunitySearchTerm("100% love")).toBe("100 love");
  });

  it("strips underscores that act as SQL LIKE wildcards", () => {
    expect(sanitizeCommunitySearchTerm("the_hobbit")).toBe("thehobbit");
  });

  it("strips parentheses that create nested groups in PostgREST syntax", () => {
    expect(sanitizeCommunitySearchTerm("Lord (of the Rings)")).toBe("Lord of the Rings");
  });

  it("trims leading and trailing whitespace after stripping", () => {
    expect(sanitizeCommunitySearchTerm("  Harry Potter  ")).toBe("Harry Potter");
  });

  it("handles a query with only special characters by returning empty string", () => {
    expect(sanitizeCommunitySearchTerm(",()%_")).toBe("");
  });

  it("leaves normal book title characters intact", () => {
    expect(sanitizeCommunitySearchTerm("Les Misérables")).toBe("Les Misérables");
  });
});
