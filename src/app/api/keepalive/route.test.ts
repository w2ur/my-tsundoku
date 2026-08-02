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
  // A secret stored as "s3cret\n" builds the target `Bearer s3cret\n`, while the
  // header Vercel sends arrives whitespace-stripped as `Bearer s3cret`.
  it("matches a secret stored with surrounding whitespace", () => {
    expect(authorizeCronRequest("Bearer s3cret", "s3cret\n").allowed).toBe(true);
    expect(authorizeCronRequest("Bearer s3cret", " s3cret ").allowed).toBe(true);
    expect(authorizeCronRequest("Bearer wrong", "s3cret\n").allowed).toBe(false);
  });

  it("treats a whitespace-only secret as unconfigured", () => {
    expect(authorizeCronRequest(null, "  \n")).toEqual({
      allowed: true,
      authenticated: false,
    });
  });

  it("still pings when no secret is configured, instead of rejecting the cron", () => {
    expect(authorizeCronRequest(null, "")).toEqual({
      allowed: true,
      authenticated: false,
    });
    expect(authorizeCronRequest("Bearer ", "").allowed).toBe(true);
    expect(authorizeCronRequest(null, undefined).allowed).toBe(true);
  });
});
