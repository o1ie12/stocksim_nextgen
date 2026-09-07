# Founder's Track Stock Simulator

Stock market simulator for an after-school business club's advanced track. Fully manual: a teacher changes a stock's price or adds a news headline whenever they want, from Admin Tools — no scripted schedule, no auto-rolled prices, no week counter. Students trade freely at any time with fake money.

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres). Auth is a custom name + 4-digit PIN flow (no email, no public signup) — not Supabase Auth.

## One-time setup

1. **Install deps**

   ```bash
   npm install
   ```

2. **Env vars** — `.env.local` already has the Supabase URL, anon key, service role key, and a generated `SESSION_SECRET`. If setting up fresh, copy `.env.local.example` and fill in the four values (Supabase keys from Project Settings → API; `SESSION_SECRET` can be any long random string).

3. **Create the database schema** — open the Supabase SQL Editor for this project and run [`supabase/schema.sql`](supabase/schema.sql) once (fresh install). Enables RLS with no policies — the app only ever talks to Supabase through the service-role key on the server, so anon access is intentionally locked out. If you have an existing database from an earlier round, run that round's migration file instead (see `supabase/migration_*.sql`, in order) to bring it up to date without losing data.

4. **Seed accounts + stocks**

   ```bash
   npm run seed
   ```

   Reads [`scripts/roster.json`](scripts/roster.json) and creates any teacher/student accounts that don't already exist (matched by name), the 10 stocks at their starting prices, and a starting-price baseline for each stock's price history. Newly-created PINs print to the console and are also saved to `scripts/roster-credentials.txt` (gitignored — distribute them to the class, then delete the file if you want).

   PINs are stored as plain text in the `pin` column on `players`/`teachers` — not hashed. This is a deliberate call: it's a classroom game with fake money, and being able to open the Supabase Table Editor and read any student's PIN directly (no reset flow, no lost-PIN dead end) matters more here than hashing would. **PINs are never displayed anywhere in the app itself** — only in Supabase directly, or in that gitignored local file.

   **To add a real roster:** edit `scripts/roster.json` (teacher and student names) and re-run `npm run seed`. Existing accounts are left untouched, so this is safe to run again later — e.g. to add a student who joins partway through.

5. **Run it**

   ```bash
   npm run dev
   ```

## How it works

- All 10 companies are fictional; no external market data, no scripted schedule. A teacher sets each stock's price directly from **Admin Tools** (`/teacher/admin`, linked from the Teacher Panel) whenever they want — that's the entire game loop. Every price change appends a row to that stock's price history, which is what the Market page's charts read.
- **Company descriptions** (sector + 1-2 sentence plain-language profile) show on each stock's "View details" panel in Market — context for students reasoning about why a headline might affect a given company.
- **News** is added the same way — a headline, optionally tagged to a stock — from Admin Tools, shown on the News feed grouped by day.
- **Trade reasoning**: the buy/sell panel has an optional "why are you making this trade?" field. Every trade lands in the `transactions` table with player/stock/action/shares/price/reasoning — exportable per-student as CSV from Admin Tools, meant as raw material for an end-of-program report.
- Buy/sell is whole-dollar, whole-share only, and runs through a single Postgres function (`execute_trade`) so a trade is atomic — no race between two rapid clicks leaving cash/shares inconsistent.
- **Admin Tools** also has direct overrides for a student's cash and holdings (for fixing mistakes), each writing a row to `admin_actions` (who/what/when) shown at the bottom of that page. All four editors (price/cash/holdings/news) are concurrency-safe — a page that's sat open while the same value changed elsewhere gets its save blocked with the real current value shown, never a silent overwrite.
- **Reset Game** (Teacher Panel, type "RESET" to confirm): wipes prices back to starting values, cash to $5,000, and clears holdings/news/trade history — for starting fresh with a new group. Player/teacher accounts (names, PINs) are untouched.
- State is fully persisted in Supabase; closing the app between sessions loses nothing.

## Project layout

- `src/lib/gameData.ts` — server-only Supabase reads, shaped for each screen
- `src/app/api/*` — the only writes in the app: login, trade, reset-pin, reset-game, admin/*
- `src/components/StockTile.tsx` — the "trading card" signature element used on every screen a stock appears on
- `src/components/admin/` — the Admin Tools page's editors (price/cash+holdings/news)
- `supabase/schema.sql` — full schema for a fresh install
- `supabase/migration_*.sql` — deltas, in order, to bring an existing database up to date
- `scripts/seed.ts` / `scripts/roster.json` — idempotent account/stock/description seeding
