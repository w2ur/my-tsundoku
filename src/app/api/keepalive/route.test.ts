import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "./route";

describe("authorizeCronRequest", () => {
  it("accepts the matching bearer token", () => {
    expect(authorizeCronRequest("Bearer s3cret", "s3cret")).toEqual({
      allowed: true,
      authenticated: true,
    });
  });

  it("rejects a wrong or missing token when a secret is configured", () => {
    expect(authorizeCronRequest("Bearer nope", "s3cret").allowed).toBe(false);
    expect(authorizeCronRequest(null, "s3cret").allowed).toBe(false);
  });

  // Regression: 798d4ed — CRON_SECRET was empty on Vercel, so the scheduler sent
  // no usable Authorization header and every daily run 401'd. The Supabase
  // keepalive never ran and the auto-pause warnings kept coming.
  it("still pings when no secret is configured, instead of rejecting the cron", () => {
    expect(authorizeCronRequest(null, "")).toEqual({
      allowed: true,
      authenticated: false,
    });
    expect(authorizeCronRequest("Bearer ", "").allowed).toBe(true);
    expect(authorizeCronRequest(null, undefined).allowed).toBe(true);
  });
});
