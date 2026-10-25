import { describe, it, expect } from "vitest";
import { metadata } from "./page";

describe("/accueil metadata", () => {
  // The French landing already lives on `/`; this copy must not compete with it in search.
  it("is noindex with its canonical on /", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe("/");
  });
});
