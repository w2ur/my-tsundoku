import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./open-library", () => ({ getBookByISBN: vi.fn() }));
vi.mock("./bnf", () => ({ lookupIsbn: vi.fn() }));

import { lookupByISBN } from "./book-lookup";
import { getBookByISBN } from "./open-library";
import { lookupIsbn } from "./bnf";

const olMock = vi.mocked(getBookByISBN);
const bnfMock = vi.mocked(lookupIsbn);

beforeEach(() => {
  olMock.mockReset();
  bnfMock.mockReset();
});

describe("lookupByISBN", () => {
  it("uses Open Library when it resolves, and never calls BnF", async () => {
    olMock.mockResolvedValue({
      title: "Cher connard",
      author: "Virginie Despentes",
      coverUrl: "c.jpg",
      isbn: "9782246826514",
    });

    const result = await lookupByISBN("9782246826514");

    expect(result).toEqual({
      title: "Cher connard",
      author: "Virginie Despentes",
      coverUrl: "c.jpg",
      isbn: "9782246826514",
      source: "openlibrary",
    });
    expect(bnfMock).not.toHaveBeenCalled();
  });

  it("falls back to BnF exactly once when Open Library misses", async () => {
    olMock.mockResolvedValue(null);
    bnfMock.mockResolvedValue({
      title: "Jacaranda",
      author: "Gaël Faye",
      coverUrl: "",
      isbn: "9782378288679",
    });

    const result = await lookupByISBN("9782378288679");

    expect(result?.source).toBe("bnf");
    expect(result?.title).toBe("Jacaranda");
    expect(bnfMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when both sources miss", async () => {
    olMock.mockResolvedValue(null);
    bnfMock.mockResolvedValue(null);
    await expect(lookupByISBN("9999999999999")).resolves.toBeNull();
  });

  it("still tries BnF when Open Library throws", async () => {
    olMock.mockRejectedValue(new Error("network"));
    bnfMock.mockResolvedValue({
      title: "Triste tigre",
      author: "Neige Sinno",
      coverUrl: "",
      isbn: "9782378286507",
    });

    const result = await lookupByISBN("9782378286507");

    expect(result?.source).toBe("bnf");
  });
});
