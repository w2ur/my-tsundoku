import { describe, it, expect } from "vitest";
import { isSupabaseApiRequest } from "./sw-routes";

describe("isSupabaseApiRequest", () => {
  const u = (s: string) => new URL(s);

  it("matches Supabase REST reads and writes", () => {
    expect(isSupabaseApiRequest(u("https://abc.supabase.co/rest/v1/books?select=*"))).toBe(true);
  });

  it("matches Supabase auth calls", () => {
    expect(isSupabaseApiRequest(u("https://abc.supabase.co/auth/v1/token"))).toBe(true);
  });

  it("leaves Supabase Storage cacheable so covers work offline", () => {
    expect(isSupabaseApiRequest(u("https://abc.supabase.co/storage/v1/object/public/covers/a.jpg"))).toBe(false);
  });

  it("ignores same-origin app requests", () => {
    expect(isSupabaseApiRequest(u("https://www.my-tsundoku.app/rest/v1/books"))).toBe(false);
  });

  it("ignores other third-party APIs", () => {
    expect(isSupabaseApiRequest(u("https://openlibrary.org/rest/v1/books"))).toBe(false);
  });

  it("is not fooled by a lookalike host", () => {
    expect(isSupabaseApiRequest(u("https://evil-supabase.co.attacker.com/rest/v1/books"))).toBe(false);
    expect(isSupabaseApiRequest(u("https://notsupabase.co/rest/v1/books"))).toBe(false);
  });
});
