import { describe, it, expect } from "vitest";
import { plural, dictionaries, DEFAULT_LOCALE } from "./index";

describe("plural", () => {
  it("returns singular form for count 1", () => {
    expect(plural(1, "{count} livre", "{count} livres")).toBe("1 livre");
  });

  it("returns plural form for count 0", () => {
    expect(plural(0, "{count} livre", "{count} livres")).toBe("0 livres");
  });

  it("returns plural form for count > 1", () => {
    expect(plural(5, "{count} livre", "{count} livres")).toBe("5 livres");
  });

  it("works without {count} placeholder", () => {
    expect(plural(1, "un livre", "des livres")).toBe("un livre");
    expect(plural(3, "un livre", "des livres")).toBe("des livres");
  });
});

describe("dictionaries", () => {
  it("exports fr and en dictionaries", () => {
    expect(dictionaries.fr).toBeDefined();
    expect(dictionaries.en).toBeDefined();
  });

  it("fr and en have the same keys", () => {
    const frKeys = Object.keys(dictionaries.fr).sort();
    const enKeys = Object.keys(dictionaries.en).sort();
    expect(frKeys).toEqual(enKeys);
  });
});

describe("DEFAULT_LOCALE", () => {
  it("is fr", () => {
    expect(DEFAULT_LOCALE).toBe("fr");
  });
});
