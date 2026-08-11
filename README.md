# Ficareer Job Parser (Hybrid: Regex + BazaarLink AI)

Parses raw job posting text into structured fields. Fixed-pattern fields (email,
WhatsApp, apply link, salary, deadline, education, work type) are extracted with
free regex. Only the fuzzy parts — splitting multiple positions, guessing
category/location, writing an excerpt, and separating responsibilities vs.
requirements — go through BazaarLink's `auto:free` model.

## Architecture (important)

The original single-file prototype stored the BazaarLink API key in the
browser's `localStorage` and called `bazaarlink.ai` directly from client-side
JavaScript. **That exposes the key to anyone who opens devtools**, so this
version is split in two:

- `public/index.html` — static frontend, no key, calls your own `/api/parse`.
- `api/parse.js` — a Vercel Serverless Function. It reads
  `BAZAARLINK_API_KEY` from a server-side environment variable and is the
  only place that ever talks to BazaarLink. The key never reaches the browser.

This matches Vercel's own guidance for third-party API keys: store them as
Environment Variables and access them only inside Serverless Functions /
Route Handlers, never in code that ships to the client.

## Local development

```bash
npm install -g vercel   # if you don't have the CLI yet
cp .env.example .env    # then edit .env and paste your real sk-bl-... key
vercel dev
```

Get a free key at https://bazaarlink.ai/free (no credit card). Free tier:
10 requests/minute, 150 requests/day.

## Deploy to GitHub + Vercel

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: hybrid job parser"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In Vercel: **New Project → Import** the GitHub repo. Framework preset:
   "Other". Leave Build Command / Output Directory empty — Vercel
   auto-detects the `public/` folder as static output and `api/*.js` as
   Serverless Functions with zero config. **Do not add a `vercel.json` with
   a `functions` block unless you actually need to**; an explicit pattern
   that doesn't exactly match will fail the build with
   `unmatched-function-pattern`.
3. Before or right after the first deploy, go to
   **Project Settings → Environment Variables** and add:
   - Name: `BAZAARLINK_API_KEY`
   - Value: your `sk-bl-...` key
   - Environment: Production (and Preview/Development if you want those too)
4. Redeploy (env var changes require a new deployment to take effect).
5. Open the deployed URL — the frontend calls `/api/parse`, which Vercel
   automatically maps to `api/parse.js`.

## Customizing category/location lists

Edit `KATEGORI_LIST` in `api/parse.js` to match the taxonomy on your
WordPress site (currently: Accounting, Audit, Bank & BUMN, Finance, GRC,
Tax, IT, Fresh Graduate).

## Notes on BazaarLink

- Model IDs need a provider prefix in general BazaarLink usage
  (`openai/gpt-4.1`), but `auto:free` is a special routing alias that stays
  valid regardless of which specific free model is live that week — that's
  why this project keeps using it as-is.
- BazaarLink states it does not store prompt/response content, only token
  counts, timestamps, and billing metadata — but upstream model providers
  have their own data policies BazaarLink can't guarantee. Don't paste
  applicant PII beyond what's already public in the job posting text.
