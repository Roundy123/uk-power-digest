import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

async function getData() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  let { data } = await supabase.from("digests").select("id,title,summary,published_at").order("published_at",{ascending:false});
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
