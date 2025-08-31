export const dynamic = 'force-dynamic';


import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

async function getData() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const usedEnv = process.env.SUPABASE_URL ? "SUPABASE_URL" : (process.env.NEXT_PUBLIC_SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL" : "MISSING");
  console.info(`[digests] Runtime=${process.env.NODE_ENV} Env=${process.env.VERCEL_ENV || 'local'}`);
  if (supabaseUrl) {
    try {
      const origin = new URL(supabaseUrl).origin;
      console.info(`[digests] Using ${usedEnv} (${origin})`);
    } catch (_e) {
      console.info(`[digests] Using ${usedEnv}`);
    }
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase env missing: SUPABASE_URL/SUPABASE_ANON_KEY");
    return [];
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.time("[digests] supabase.select");
  let { data, error } = await supabase.from("digests").select("id,title,summary,published_at").order("published_at",{ascending:false});
  console.timeEnd("[digests] supabase.select");
  if (error) {
    console.error("[digests] Supabase select error:", { code: (error as any).code, message: error.message, details: (error as any).details, hint: (error as any).hint });
    return [];
  }
  console.info(`[digests] Rows fetched: ${data?.length || 0}`);
  return data || [];
}

export default async function Page() {
  const rows = await getData();
  return (
    <main>
      <h2>Digests</h2>
      <ul>
        {rows.map(r => (
          <li key={r.id}>
            <Link href={`/digests/${r.id}`}>{r.title}</Link> — {r.summary}
          </li>
        ))}
      </ul>
    </main>
  );
}
