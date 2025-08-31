import { createClient } from "@supabase/supabase-js";

async function getData(id) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  let { data } = await supabase.from("digests").select("*").eq("id",id).maybeSingle();
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
