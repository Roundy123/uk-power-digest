import { createClient } from "@supabase/supabase-js";

async function getData(id) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase env missing: SUPABASE_URL/SUPABASE_ANON_KEY");
    return null;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  let { data, error } = await supabase.from("digests").select("*").eq("id",id).maybeSingle();
  if (error) {
    console.error("Supabase select error (/digests/[id]):", error);
    return null;
  }
  return data;
}

export default async function Page({ params }) {
  const row = await getData(params.id);
  if (!row) return <p>Not found</p>;
  return (
    <main>
      <h2>{row.title}</h2>
      <p><em>{new Date(row.published_at).toLocaleString()}</em></p>
      <p>{row.summary}</p>
      <pre>{row.body_markdown}</pre>
    </main>
  );
}
