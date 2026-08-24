# Founder's Track Stock Simulator

Stock market simulator for an after-school business club's advanced track. Runs alongside a 9-week entrepreneurship curriculum — teacher controls pacing via "Advance Week," students trade freely in between.

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres). Auth is a custom name + 4-digit PIN flow (no email, no public signup) — not Supabase Auth.

## One-time setup

1. **Install deps**

   ```bash
   npm install
   ```

2. **Env vars** — `.env.local` already has the Supabase URL, anon key, service role key, and a generated `SESSION_SECRET`. If setting up fresh, copy `.env.local.example` and fill in the four values (Supabase keys from Project Settings → API; `SESSION_SECRET` can be any long random string).

3. **Create the database schema** — open the Supabase SQL Editor for this project and run [`supabase/schema.sql`](supabase/schema.sql) once. This creates all 7 tables/functions and enables RLS with no policies (the app only ever talks to Supabase through the service-role key on the server, so anon access is intentionally locked out).

4. **Seed accounts + stocks**

   ```bash
   npm run seed
   ```

   Reads [`scripts/roster.json`](scripts/roster.json) and creates any teacher/student accounts that don't already exist (matched by name), the 10 stocks at their starting prices, and the Week 1 market state. Newly-created PINs print to the console and are also saved to `scripts/roster-credentials.txt` (gitignored — distribute them to the class, then delete the file).

   **To add a real roster:** edit `scripts/roster.json` (teacher and student names) and re-run `npm run seed`. Existing accounts are left untouched, so this is safe to run again later — e.g. to add a student who joins in week 3.

5. **Run it**

   ```bash
   npm run dev
   ```

## How the simulation works

- All 10 companies are fictional; no external market data. Price moves each week are scripted per a fixed 9-week schedule (see `src/lib/marketEngine.ts`), with controlled randomness inside each week's stated range.
- Only a teacher account can click **Advance Week** (Teacher Panel). Each click rolls that week's price move, logs price history, posts news headlines, and (on the very first advance) assigns that game's "dip stock" and "hype stock" based on what percentage of players are actually holding each stock — so weeks 4/5/7's dramatic moves land on whatever the class actually gravitated toward.
- Buy/sell is whole-dollar, whole-share only, and runs through a single Postgres function (`execute_trade`) so a trade is atomic — no race between two rapid clicks leaving cash/shares inconsistent.
- State is fully persisted in Supabase; closing the app between weekly sessions loses nothing.

## Project layout

- `src/lib/marketEngine.ts` — pure week-move math + dip/hype assignment logic (no DB access, easy to reason about independent of persistence)
- `src/lib/gameData.ts` — server-only Supabase reads, shaped for each screen
- `src/app/api/*` — the only writes in the app: login, trade, advance-week
- `src/components/StockTile.tsx` — the "trading card" signature element used on every screen a stock appears on
- `supabase/schema.sql` — full schema, run once by hand in the SQL editor
- `scripts/seed.ts` / `scripts/roster.json` — idempotent account/stock seeding
