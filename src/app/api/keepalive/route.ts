import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
