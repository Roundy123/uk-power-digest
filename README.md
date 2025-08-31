# UK Power Daily — n8n ↔ Next.js ↔ Supabase

A small, production-minded setup to publish **Daily UK Power Market** digests:

- **n8n** (Render): fetch public signals → ask OpenAI to write a brief → **POST** to your site
- **Next.js** site: receives signed payloads, stores them in **Supabase**, renders public pages
- **Supabase**: one table (`public.digests`) for posts (+ RLS policies you control)

> This README is tailored to: **n8n already deployed on Render using a Supabase database**.

---

## 0) What you’ll need

- A Supabase project (already in use by your n8n).
- OpenAI API key (for the summariser node).
- A place to host the Next.js site (Vercel or Render Web Service).
- A shared secret for webhook signing:  
  ```bash
  openssl rand -hex 32
  # example output: a3f5c9d3e7... (keep it private)
  ```

---

## 1) Supabase — schema & keys

### 1.1 Create the table
In your **existing** Supabase project, run this SQL (SQL editor → new query → run):
```sql
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

-- Demo policy: allow public reads. Replace with auth-gated policy for production.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'digests' and policyname = 'Public read digests'
  ) then
    create policy "Public read digests" on public.digests for select using (true);
  end if;
end$$;
```

> You can later tighten reads to authenticated users only and/or create insert policies if you switch to direct Supabase writes.

### 1.2 Grab your keys (Supabase dashboard → **Settings → API**)
- **Project URL** → `SUPABASE_URL`
- **anon public** key → `SUPABASE_ANON_KEY` (safe for browser reads if RLS allows)
- **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (**server-only**, bypasses RLS)

---

## 2) Next.js site (App Router) — local & deploy

### 2.1 Download the starter
- 📦 **Starter zip**: from Chat (the link you downloaded)
  - Unzip it, `cd` into the folder.

Files of note:
- `app/api/n8n/ingest/route.ts` — **HMAC-verified** webhook → inserts into Supabase
- `app/digests` — list/detail pages
- `supabase.sql` — the same table definition (for reference)
- `.env.sample` — copy to `.env.local` and fill

### 2.2 Environment variables
Create `.env.local` in the project root (copy from `.env.sample`) and fill in:
```env
# Exposed to the browser (reads only)
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Server-only (never expose to the browser)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
N8N_WEBHOOK_SECRET=your-long-random-string
```

### 2.3 Run locally
```bash
npm i
npm run dev
# visit http://localhost:3000 and /digests
```

### 2.4 Deploy
- **Vercel** (recommended quick start): push to Git and add the same env vars in Project Settings → Environment Variables.
- **Render** (Node Web Service): set Build Command `npm run build`, Start Command `npm start`, and add the env vars.

> Keep **SUPABASE_SERVICE_ROLE_KEY** server-only (no `NEXT_PUBLIC_`). The site’s API route uses it to insert rows after verifying the signature.

---

## 3) n8n (Render) — import flow & sign requests

### 3.1 Import the workflow
- From Chat, download the **n8n workflow JSON** and import it into your n8n instance on Render.

### 3.2 Add credentials & variables
- **OpenAI** node → add your OpenAI API key.
- In **Render → Environment** (or n8n Settings → Variables), add:
  ```
  N8N_WEBHOOK_SECRET=the-same-long-random-string-as-in-Next.js
  ```

### 3.3 Add an HMAC-signing Function node (before the POST)
Insert a **Function** node right before the final HTTP POST and paste:

```js
// Function node — build body & sign with HMAC
// Requires N8N_WEBHOOK_SECRET in your n8n environment.
const crypto = require('crypto');
const secret = $env.N8N_WEBHOOK_SECRET;

// Build the payload you'll publish
const body = {
  title: `UK Power — ${new Date().toLocaleString('en-GB',{ timeZone:'Europe/London', dateStyle:'medium', timeStyle:'short' })}`,
  published_at: new Date().toISOString(),
  summary: $json.summary || 'Daily UK power market brief',
  body_markdown: $json.body_markdown || $json.text || '',
  sources: [
    { label: 'Gridwatch', url: 'https://gridwatch.templar.co.uk' },
    { label: 'GB Live',   url: 'https://grid.iamkate.com' },
  ],
};

const raw = JSON.stringify(body);
const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex');

return [{
  json: body,
  headers: { 'x-n8n-signature': `sha256=${sig}` }
}];
```

### 3.4 Configure the HTTP POST node
- **URL**: your site’s endpoint  
  - Local: `http://localhost:3000/api/n8n/ingest`  
  - Prod: `https://your-domain.com/api/n8n/ingest`
- **Method**: `POST`
- **Send Body**: `ON`
- **JSON Parameters**: `ON`
- **Response Format**: `JSON`
- **Headers**: `={{$json.headers}}`
- **Body**: `={{$json}}`

### 3.5 Schedule (UK time)
Set **Cron** to run at **07:30** and **16:30** Europe/London on weekdays.
- If Render/n8n runs in UTC, either use the Cron node’s timezone setting or adjust hours for DST.

---

## 4) Test the full pipeline

### 4.1 Dry run from n8n
- Execute the HMAC **Function** node → then the **HTTP POST** node.
- Expect `{{ ok: true }}` from your site.

### 4.2 Check the site
- Visit `https://your-domain.com/digests` — you should see the new digest.

### 4.3 Check Supabase
```sql
select id, title, published_at
from public.digests
order by created_at desc
limit 5;
```

---

## 5) Troubleshooting

**401 "bad signature"**
- `N8N_WEBHOOK_SECRET` mismatch between n8n and Next.js.
- HMAC must be computed on the **exact raw JSON** that you send in the POST body.

**500 errors from API route**
- Check your site logs (Vercel/Render). Common causes:
  - Missing `SUPABASE_SERVICE_ROLE_KEY` on the server.
  - Invalid Supabase URL/keys.
  - JSON shape not matching the expected fields.

**Nothing shows on /digests**
- RLS read policy may be too strict. For a public demo, the README uses a `select using (true)` policy. Tighten later if needed.

**Timezone surprises**
- Confirm Cron timezone in n8n.
- The title uses `Europe/London` formatting; change if you prefer ISO dates only.

---

## 6) Security notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` **server-only** and out of the browser.
- Use **HMAC** verification to ensure only your n8n can post.
- Consider stricter RLS policies for reads and separate policies for inserts if you switch to direct Supabase writes.
- Rotate secrets periodically (`N8N_WEBHOOK_SECRET`, service role key if compromised).

---

## 7) Nice-to-haves (optional)

- **Slack & Email**: Add Slack and SMTP/Resend/Postmark nodes in n8n after the POST, so digests go out immediately.
- **Pretty markdown**: Swap the `<pre>` viewer for `remark/rehype` to render headers, lists, links.
- **RSS/Atom**: Generate a feed at `/feed.xml` for subscribers.
- **RAG later**: Store past digests in a vector DB and retrieve “similar days” for richer context.

---

## 8) Quick reference — endpoint contract

**POST** `/api/n8n/ingest`  
**Header**: `x-n8n-signature: sha256=<hex-hmac>`  
**Body** (example):
```json
{
  "title": "UK Power — 29 Aug 2025, 16:30",
  "published_at": "2025-08-29T15:30:00Z",
  "summary": "Short headline sentence...",
  "body_markdown": "## Headline\n- bullet 1\n- bullet 2",
  "sources": [
    { "label": "Gridwatch", "url": "https://gridwatch.templar.co.uk" },
    { "label": "GB Live", "url": "https://grid.iamkate.com" }
  ]
}
```

Server does:
1) Verify HMAC against `N8N_WEBHOOK_SECRET`  
2) Insert row into `public.digests` with the **service role** key  
3) Return `{ "ok": true, "id": "<uuid>" }`

---

## 9) Changelog

- 2025-08-30 — Initial README generated for Render+n8n+Supabase setup.
