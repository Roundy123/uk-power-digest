import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Check API key header
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json(
      { ok: false, error: "bad api key" },
      { status: 401 }
    );
  }

  // Parse body JSON
  const body = await req.json();

  // Create Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert into digests table
  const { error } = await supabase.from("digests").insert({
    title: body.title,
    published_at: body.published_at,
    summary: body.summary,
    body_markdown: body.body_markdown,
    sources: body.sources || [],
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
