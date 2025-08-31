import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const reqId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  console.info(`[ingest ${reqId}] Incoming request`);
  // Check API key header
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.N8N_WEBHOOK_SECRET) {
    console.warn(`[ingest ${reqId}] Unauthorized request: bad api key`);
    return NextResponse.json(
      { ok: false, error: "bad api key" },
      { status: 401 }
    );
  }

  // Parse body JSON
  let body: any;
  try {
    body = await req.json();
  } catch (e: any) {
    console.error(`[ingest ${reqId}] Invalid JSON body`, { message: e?.message });
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert into digests table
  console.time(`[ingest ${reqId}] supabase.insert`);
  const { error } = await supabase.from("digests").insert({
    title: body.title,
    published_at: body.published_at,
    summary: body.summary,
    body_markdown: body.body_markdown,
    sources: body.sources || [],
  });
  console.timeEnd(`[ingest ${reqId}] supabase.insert`);

  if (error) {
    console.error(`[ingest ${reqId}] Supabase insert error`, { code: (error as any).code, message: error.message, details: (error as any).details, hint: (error as any).hint });
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  console.info(`[ingest ${reqId}] Insert ok`);
  return NextResponse.json({ ok: true });
}
