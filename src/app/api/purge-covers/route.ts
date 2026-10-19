import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { drainCoverQueue } from "@/lib/cover-cleanup";

export const dynamic = "force-dynamic";
// Vercel Hobby allows up to 60 s: enough to drain a full page of 500 queue rows.
export const maxDuration = 60;

function bearerMatches(header: string | null, secret: string): boolean {
  const given = Buffer.from(header?.trim() ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily cron: deletes the cover files queued by the SQL purge of soft-deleted
 * books and by account deletions whose storage cleanup failed. It holds the
 * service-role key, so unlike /api/keepalive it fails closed: no CRON_SECRET,
 * no run.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase env not configured" }, { status: 500 });
  }

  try {
    const result = await drainCoverQueue({ url, serviceKey });
    return NextResponse.json(
      { ok: result.failed === 0, ...result },
      { status: result.failed === 0 ? 200 : 502 },
    );
  } catch (err) {
    console.error("Cover purge failed", err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
