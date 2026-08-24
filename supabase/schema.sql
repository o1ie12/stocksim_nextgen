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
  current_price integer not null
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

-- ---------- execute_trade ----------
-- Atomic buy/sell: locks the stock + player + holding rows, validates funds
-- or share count, then updates cash and holdings in one transaction. Called
-- via RPC using the service-role key, which bypasses RLS the same way
-- direct service-role table access does.
create or replace function execute_trade(
  p_player_id uuid,
  p_stock_id uuid,
  p_action text, -- 'buy' | 'sell'
  p_shares integer
) returns json
language plpgsql
as $$
declare
  v_price integer;
  v_cash integer;
  v_shares integer;
  v_cost integer;
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

  return json_build_object('ok', true, 'price', v_price, 'cost', v_cost);
end;
$$;
