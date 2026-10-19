import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "./route";

const req = (auth?: string) =>
  new Request("https://x.test/api/purge-covers", {
    headers: auth ? { authorization: auth } : {},
  });

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/purge-covers", () => {
  it("fails closed when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req())).status).toBe(500);
  });

  it("rejects a wrong bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await GET(req("Bearer nope"))).status).toBe(401);
  });

  it("rejects a token that differs only in length or in its last character", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await GET(req("Bearer s3cre"))).status).toBe(401);
    expect((await GET(req("Bearer s3crets"))).status).toBe(401);
    expect((await GET(req("Bearer s3creT"))).status).toBe(401);
    expect((await GET(req("s3cret"))).status).toBe(401);
  });

  it("refuses to run without the service-role key", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect((await GET(req("Bearer s3cret"))).status).toBe(500);
  });
});
