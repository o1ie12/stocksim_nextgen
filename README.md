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

3. **Create the database schema** — open the Supabase SQL Editor for this project and run [`supabase/schema.sql`](supabase/schema.sql) once. This creates all tables/functions and enables RLS with no policies (the app only ever talks to Supabase through the service-role key on the server, so anon access is intentionally locked out). If you already have a Round 1 database, run [`supabase/migration_002_round2.sql`](supabase/migration_002_round2.sql) instead — it adds the Round 2 tables/columns without touching existing data.

4. **Seed accounts + stocks**

   ```bash
   npm run seed
   ```

   Reads [`scripts/roster.json`](scripts/roster.json) and creates any teacher/student accounts that don't already exist (matched by name), the 10 stocks at their starting prices, and the Week 1 market state. Newly-created PINs print to the console and are also saved to `scripts/roster-credentials.txt` (gitignored — distribute them to the class, then delete the file if you want).

   PINs are stored as plain text in the `pin` column on `players`/`teachers` — not hashed. This is a deliberate call: it's a classroom game with fake money, and being able to open the Supabase Table Editor and read any student's PIN directly (no reset flow, no lost-PIN dead end) matters more here than hashing would. **PINs are never displayed anywhere in the app itself** — only in Supabase directly, or in that gitignored local file.

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

### Round 2: indirect news, trade reasoning, admin tools

- **Company descriptions** (sector + 1-2 sentence plain-language profile) show on each stock's "View details" panel in Market. They're what makes the indirect news solvable — a kid has to connect "steel prices spike" to AeroDrone/VoltUp via their own description mentioning metal.
- **Indirect news**: instead of a headline naming a stock and direction, most weeks post one macro-feeling event (`src/lib/marketEngine.ts` → `NEWS_SCENARIOS`) secretly tied to 1-2 stocks and a direction. That mapping resolves on the *next* advance — this week's news, next roll's consequence — biasing (not fully determining) that stock's move, unless it already has a scripted dip/hype/NovaMed move that week, in which case the scripted move wins and the hint is just marked resolved (unfired). The mapping is only ever visible to teachers, on the Admin Tools page — never to students.
- **Trade reasoning**: the buy/sell panel has an optional "why are you making this trade?" field. Every trade (regardless of whether reasoning was filled in) lands in the `transactions` table with player/stock/action/shares/price/week/reasoning — exportable per-student as CSV from Admin Tools for the end-of-program report.
- **Admin Tools** (`/teacher/admin`, linked from the Teacher Panel): direct overrides for stock prices, a student's cash, a student's holdings, and the news log (add/edit/delete) — for fixing mistakes or crafting a scenario, not everyday use. Every override writes a row to `admin_actions` (who/what/when), shown at the bottom of that page.

## Project layout

- `src/lib/marketEngine.ts` — pure week-move math, dip/hype assignment, and the indirect news scenario pool (no DB access, easy to reason about independent of persistence)
- `src/lib/gameData.ts` — server-only Supabase reads, shaped for each screen
- `src/app/api/*` — the only writes in the app: login, trade, advance-week, reset-pin, admin/*
- `src/components/StockTile.tsx` — the "trading card" signature element used on every screen a stock appears on
- `src/components/admin/` — the Admin Tools page's editors (price/cash/holdings/news)
- `supabase/schema.sql` — full schema for a fresh install
- `supabase/migration_002_round2.sql` — the delta to bring an existing Round 1 database up to date
- `scripts/seed.ts` / `scripts/roster.json` — idempotent account/stock/description seeding
