import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfig() {
  vi.resetModules();
  return (await import("./next.config")).default;
}

afterEach(() => vi.unstubAllEnvs());

describe("next.config", () => {
  it("sends the static header baseline on every route", async () => {
    const config = await loadConfig();
    const [rule] = await config.headers!();
    expect(rule.source).toBe("/:path*");
    const headers = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
    expect(headers["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("does not advertise the framework", async () => {
    expect((await loadConfig()).poweredByHeader).toBe(false);
  });

  it("allowlists Open Library and this project's Supabase host, nothing wider", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd1234.supabase.co");
    const config = await loadConfig();
    expect(config.images!.remotePatterns).toEqual([
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "abcd1234.supabase.co" },
    ]);
  });

  it("allowlists no Supabase host when the project URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const config = await loadConfig();
    expect(config.images!.remotePatterns).toEqual([
      { protocol: "https", hostname: "covers.openlibrary.org" },
    ]);
  });
});
