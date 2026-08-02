import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * A cron ping that authenticates must never be silently disabled by a missing
 * secret. When CRON_SECRET is absent or empty, Vercel sends no usable
 * Authorization header, so a strict check rejects its own scheduler forever
 * and Supabase drifts back toward auto-pause with nothing to show for it.
 * No secret configured means the ping still runs, flagged as unauthenticated.
 */
export function authorizeCronRequest(
  authHeader: string | null,
  secret: string | undefined,
): { allowed: boolean; authenticated: boolean } {
  if (!secret) {
    return { allowed: true, authenticated: false };
  }
  return { allowed: authHeader === `Bearer ${secret}`, authenticated: true };
}

export async function GET(request: Request) {
  const { allowed, authenticated } = authorizeCronRequest(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
  );
  if (!allowed) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase env not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `${url}/rest/v1/community_books?select=id&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, status: res.status },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    authenticated,
    pingedAt: new Date().toISOString(),
  });
}
