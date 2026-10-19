import { describe, it, expect, vi } from "vitest";
import { drainCoverQueue } from "./cover-cleanup";

type Call = { url: string; method: string; body?: string };

function fakeFetch(queue: string[], opts: { storageStatus?: number } = {}) {
  const calls: Call[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.includes("/rest/v1/cover_cleanup_queue?select")) {
      return new Response(JSON.stringify(queue.map((path) => ({ path }))));
    }
    if (url.includes("/storage/v1/object/list/covers")) {
      return new Response(JSON.stringify([{ name: "a.jpg" }, { name: "b.jpg" }]));
    }
    if (url.includes("/storage/v1/object/covers")) {
      return new Response("[]", { status: opts.storageStatus ?? 200 });
    }
    return new Response(null, { status: 204 });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const cfg = { url: "https://x.supabase.co", serviceKey: "svc" };

describe("drainCoverQueue", () => {
  it("deletes queued files then their queue rows", async () => {
    const { impl, calls } = fakeFetch(["u1/b1.jpg"]);
    const r = await drainCoverQueue({ ...cfg, fetchImpl: impl });
    expect(r).toEqual({ queued: 1, removed: 1, failed: 0 });
    const del = calls.find((c) => c.url.endsWith("/storage/v1/object/covers"));
    expect(JSON.parse(del!.body!)).toEqual({ prefixes: ["u1/b1.jpg"] });
    expect(calls.some((c) => c.method === "DELETE" && c.url.includes("path=eq.u1%2Fb1.jpg"))).toBe(true);
  });

  it("expands a user prefix into the files listed under it", async () => {
    const { impl, calls } = fakeFetch(["u1/"]);
    await drainCoverQueue({ ...cfg, fetchImpl: impl });
    const del = calls.find((c) => c.url.endsWith("/storage/v1/object/covers"));
    expect(JSON.parse(del!.body!)).toEqual({ prefixes: ["u1/a.jpg", "u1/b.jpg"] });
  });

  it("keeps the queue row when the storage delete fails, so it is retried", async () => {
    const { impl, calls } = fakeFetch(["u1/b1.jpg"], { storageStatus: 500 });
    const r = await drainCoverQueue({ ...cfg, fetchImpl: impl });
    expect(r).toEqual({ queued: 1, removed: 0, failed: 1 });
    expect(calls.some((c) => c.url.includes("cover_cleanup_queue?path=eq"))).toBe(false);
  });
});
