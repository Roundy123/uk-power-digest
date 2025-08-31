create table if not exists public.digests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  published_at timestamptz not null,
  summary text,
  body_markdown text,
  sources jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.digests enable row level security;
create policy "Public read digests" on public.digests for select using (true);
