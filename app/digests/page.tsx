export const dynamic = 'force-dynamic';


import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

async function getData() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase env missing: SUPABASE_URL/SUPABASE_ANON_KEY");
    return [];
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  let { data, error } = await supabase.from("digests").select("id,title,summary,published_at").order("published_at",{ascending:false});
  if (error) {
    console.error("Supabase select error (/digests):", error);
    return [];
  }
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
