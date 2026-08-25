-- Founder's Track Stock Simulator — schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / drop-and-recreate for policies.

create extension if not exists pgcrypto;

-- ---------- players ----------
-- PINs are stored in plain text on purpose: this app is a classroom game
-- with fake money, and the practical need (any teacher can look a PIN up
-- directly in Supabase, no recovery flow needed) outweighs hashing them.
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin text not null,
  cash integer not null default 5000,
  created_at timestamptz not null default now()
);

-- ---------- teachers ----------
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin text not null,
  created_at timestamptz not null default now()
);

-- ---------- stocks ----------
create table if not exists stocks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,          -- stable code identifier, e.g. 'snackbox'
  name text not null,
  personality text not null default '',
  color text not null default '#111111',
  sort_order integer not null default 0,
  starting_price integer not null,
  current_price integer not null,
  sector text not null default '',
  description text not null default ''
);

-- ---------- holdings ----------
create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  stock_id uuid not null references stocks(id) on delete cascade,
  shares integer not null default 0 check (shares >= 0),
  unique (player_id, stock_id)
);

-- ---------- price_history ----------
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references stocks(id) on delete cascade,
  week_number integer not null,
  price integer not null,
  recorded_at timestamptz not null default now(),
  unique (stock_id, week_number)
);

-- ---------- news_log ----------
create table if not exists news_log (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null,
  stock_id uuid references stocks(id) on delete set null,
  headline text not null,
  created_at timestamptz not null default now()
);

-- ---------- market_state (single row) ----------
create table if not exists market_state (
  id integer primary key default 1 check (id = 1),
  current_week integer not null default 1,
  dip_stock_id uuid references stocks(id),
  hype_stock_id uuid references stocks(id),
  novamed_event text, -- 'spike' | 'flop', set during week 7 advance
  updated_at timestamptz not null default now()
);

-- ---------- transactions ----------
-- One row per buy/sell, with the student's own reasoning captured at the
-- moment of the trade. This is the raw material for the end-of-program
-- report deliverable — see the per-student CSV export in the teacher panel.
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  stock_id uuid not null references stocks(id) on delete cascade,
  action text not null check (action in ('buy', 'sell')),
  shares integer not null,
  price integer not null,
  reasoning text,
  week_number integer not null,
  created_at timestamptz not null default now()
);

-- ---------- news_hints ----------
-- Indirect news: a headline posted this week names no stock and no
-- direction. Behind the scenes it's tied to 1-2 stocks and a direction
-- here, which gets applied to bias next week's roll for those stocks, then
-- marked consumed. Never exposed to students; teacher panel can show it.
create table if not exists news_hints (
  id uuid primary key default gen_random_uuid(),
  news_log_id uuid references news_log(id) on delete cascade,
  stock_id uuid not null references stocks(id) on delete cascade,
  direction text not null check (direction in ('up', 'down')),
  scenario_key text not null,
  planted_week integer not null,
  consumed_at timestamptz
);

-- ---------- admin_actions ----------
-- Audit trail for manual teacher overrides (price/cash/holdings/news edits).
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id) on delete set null,
  teacher_name text,
  description text not null,
  created_at timestamptz not null default now()
);

-- Lock every table down at the RLS layer. The app talks to Supabase only
-- through server-side route handlers using the service role key, which
-- bypasses RLS — so these tables should never be reachable via the public
-- anon key. Enabling RLS with zero policies denies all anon/auth access.
alter table players enable row level security;
alter table teachers enable row level security;
alter table stocks enable row level security;
alter table holdings enable row level security;
alter table price_history enable row level security;
alter table news_log enable row level security;
alter table market_state enable row level security;
alter table transactions enable row level security;
alter table news_hints enable row level security;
alter table admin_actions enable row level security;

-- ---------- execute_trade ----------
-- Atomic buy/sell: locks the stock + player + holding rows, validates funds
-- or share count, then updates cash and holdings in one transaction. Called
-- via RPC using the service-role key, which bypasses RLS the same way
-- direct service-role table access does.
create or replace function execute_trade(
  p_player_id uuid,
  p_stock_id uuid,
  p_action text, -- 'buy' | 'sell'
  p_shares integer,
  p_reasoning text default null
) returns json
language plpgsql
as $$
declare
  v_price integer;
  v_cash integer;
  v_shares integer;
  v_cost integer;
  v_week integer;
begin
  if p_shares is null or p_shares <= 0 then
    raise exception 'shares must be a positive whole number';
  end if;

  select current_price into v_price from stocks where id = p_stock_id for update;
  if v_price is null then
    raise exception 'stock not found';
  end if;

  select cash into v_cash from players where id = p_player_id for update;
  if v_cash is null then
    raise exception 'player not found';
  end if;

  insert into holdings (player_id, stock_id, shares)
    values (p_player_id, p_stock_id, 0)
    on conflict (player_id, stock_id) do nothing;

  select shares into v_shares from holdings
    where player_id = p_player_id and stock_id = p_stock_id for update;

  v_cost := v_price * p_shares;

  if p_action = 'buy' then
    if v_cash < v_cost then
      raise exception 'insufficient cash';
    end if;
    update players set cash = cash - v_cost where id = p_player_id;
    update holdings set shares = shares + p_shares
      where player_id = p_player_id and stock_id = p_stock_id;
  elsif p_action = 'sell' then
    if v_shares < p_shares then
      raise exception 'insufficient shares';
    end if;
    update players set cash = cash + v_cost where id = p_player_id;
    update holdings set shares = shares - p_shares
      where player_id = p_player_id and stock_id = p_stock_id;
  else
    raise exception 'invalid action: %', p_action;
  end if;

  select current_week into v_week from market_state where id = 1;

  insert into transactions (player_id, stock_id, action, shares, price, reasoning, week_number)
    values (p_player_id, p_stock_id, p_action, p_shares, v_price, p_reasoning, coalesce(v_week, 1));

  return json_build_object('ok', true, 'price', v_price, 'cost', v_cost);
end;
$$;

-- ---------- reset_game ----------
-- Resets shared game state back to a clean Week 1: stocks to starting
-- price, week counter to 1, dip/hype/NovaMed cleared (re-resolves after the
-- next Advance Week past Week 1), all holdings cleared, all cash reset to
-- $5,000, price history trimmed back to the Week 1 starting point, and the
-- news log cleared (cascades to news_hints). Player/teacher accounts
-- (names, PINs) are untouched — this is a game-state reset, not an account
-- wipe. Meant to be run any number of times, between semesters/groups.
create or replace function reset_game() returns json
language plpgsql
as $$
begin
  -- `where true` on the unconditionally-affecting statements: this project
  -- has a safe-update guard that rejects any UPDATE/DELETE without a WHERE
  -- clause, even inside a function, so a genuinely-unconditional reset
  -- needs an explicit (always-true) one.
  update stocks set current_price = starting_price where true;
  delete from holdings where true;
  update players set cash = 5000 where true;
  delete from price_history where week_number > 1;
  delete from news_log where true;
  update market_state
    set current_week = 1, dip_stock_id = null, hype_stock_id = null, novamed_event = null, updated_at = now()
    where id = 1;
  return json_build_object('ok', true);
end;
$$;

-- ---------- admin_set_* / admin_update_news ----------
-- Compare-and-swap versions of the Admin Tools overrides: each locks the
-- row, checks the caller's expected (page-loaded) value against the real
-- current value, and only applies the write if they still match — so a
-- teacher's page that's gone stale (someone else traded, advanced the
-- week, or made another edit while it sat open) can never silently
-- overwrite a change it never saw. On mismatch, returns the real current
-- value instead of applying anything.
create or replace function admin_set_price(
  p_stock_id uuid,
  p_expected_price integer,
  p_new_price integer
) returns json
language plpgsql
as $$
declare
  v_actual integer;
  v_name text;
begin
  select current_price, name into v_actual, v_name from stocks where id = p_stock_id for update;
  if v_name is null then
    raise exception 'stock not found';
  end if;

  if v_actual <> p_expected_price then
    return json_build_object('ok', false, 'conflict', true, 'currentValue', v_actual, 'name', v_name);
  end if;

  update stocks set current_price = p_new_price where id = p_stock_id;
  return json_build_object('ok', true, 'name', v_name);
end;
$$;

create or replace function admin_set_cash(
  p_player_id uuid,
  p_expected_cash integer,
  p_new_cash integer
) returns json
language plpgsql
as $$
declare
  v_actual integer;
  v_name text;
begin
  select cash, name into v_actual, v_name from players where id = p_player_id for update;
  if v_name is null then
    raise exception 'player not found';
  end if;

  if v_actual <> p_expected_cash then
    return json_build_object('ok', false, 'conflict', true, 'currentValue', v_actual, 'name', v_name);
  end if;

  update players set cash = p_new_cash where id = p_player_id;
  return json_build_object('ok', true, 'name', v_name);
end;
$$;

create or replace function admin_set_holding(
  p_player_id uuid,
  p_stock_id uuid,
  p_expected_shares integer,
  p_new_shares integer
) returns json
language plpgsql
as $$
declare
  v_actual integer;
  v_player_name text;
  v_stock_name text;
begin
  select name into v_player_name from players where id = p_player_id;
  if v_player_name is null then
    raise exception 'player not found';
  end if;

  select name into v_stock_name from stocks where id = p_stock_id;
  if v_stock_name is null then
    raise exception 'stock not found';
  end if;

  insert into holdings (player_id, stock_id, shares)
    values (p_player_id, p_stock_id, 0)
    on conflict (player_id, stock_id) do nothing;

  select shares into v_actual from holdings
    where player_id = p_player_id and stock_id = p_stock_id for update;

  if v_actual <> p_expected_shares then
    return json_build_object(
      'ok', false, 'conflict', true, 'currentValue', v_actual,
      'playerName', v_player_name, 'stockName', v_stock_name
    );
  end if;

  update holdings set shares = p_new_shares
    where player_id = p_player_id and stock_id = p_stock_id;

  return json_build_object('ok', true, 'playerName', v_player_name, 'stockName', v_stock_name);
end;
$$;

create or replace function admin_update_news(
  p_news_id uuid,
  p_expected_headline text,
  p_new_headline text
) returns json
language plpgsql
as $$
declare
  v_actual text;
begin
  select headline into v_actual from news_log where id = p_news_id for update;
  if v_actual is null then
    raise exception 'news entry not found';
  end if;

  if v_actual <> p_expected_headline then
    return json_build_object('ok', false, 'conflict', true, 'currentValue', v_actual);
  end if;

  update news_log set headline = p_new_headline where id = p_news_id;
  return json_build_object('ok', true);
end;
$$;
