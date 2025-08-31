import { createClient } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export const revalidate = 0; // ensure fresh reads in prod

async function getDigest(id: string) {
  const url  = process.env.SUPABASE_URL  ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from('digests')
    .select('id,title,summary,body_markdown,published_at,sources')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export default async function Page({ params }: { params: { id: string } }) {
  const d = await getDigest(params.id);

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <p><Link href="/digests">← Back</Link></p>
      <h1>{d.title}</h1>
      <p style={{ color: '#666' }}>
        {new Date(d.published_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
      </p>

      {d.summary && <p style={{ fontStyle: 'italic' }}>{d.summary}</p>}

      {d.body_markdown ? (
        <article className="prose">
          <ReactMarkdown>{d.body_markdown}</ReactMarkdown>
        </article>
      ) : (
        <p>No analysis text available.</p>
      )}

      {Array.isArray(d.sources) && d.sources.length > 0 && (
        <>
          <h3>Sources</h3>
          <ul>
            {d.sources.map((s: any, i: number) => (
              <li key={i}><a href={s.url} target="_blank">{s.label || s.url}</a></li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
