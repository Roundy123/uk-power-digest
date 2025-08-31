import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function verify(raw, sig, secret) {
  if (!sig) return false;
  const [algo, val] = sig.split("=");
  if (algo !== "sha256") return false;
  const h = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(val), Buffer.from(h));
}

export async function POST(req) {
  const raw = await req.text();
  const ok = verify(raw, req.headers.get("x-n8n-signature"), process.env.N8N_WEBHOOK_SECRET || "");
  if (!ok) return NextResponse.json({ok:false,error:"bad signature"},{status:401});
  const body = JSON.parse(raw);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from("digests").insert({
    title: body.title,
    published_at: body.published_at,
    summary: body.summary,
    body_markdown: body.body_markdown,
    sources: body.sources||[]
  });
  return NextResponse.json({ok:true});
}
