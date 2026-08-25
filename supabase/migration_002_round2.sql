-- Round 2 additions: company descriptions, trade reasoning log, indirect
-- news hints, and the teacher admin-action audit trail.
-- Run once in the Supabase SQL editor.

alter table stocks add column if not exists sector text not null default '';
alter table stocks add column if not exists description text not null default '';

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

create table if not exists news_hints (
  id uuid primary key default gen_random_uuid(),
  news_log_id uuid references news_log(id) on delete cascade,
  stock_id uuid not null references stocks(id) on delete cascade,
  direction text not null check (direction in ('up', 'down')),
  scenario_key text not null,
  planted_week integer not null,
  consumed_at timestamptz
);

create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id) on delete set null,
  teacher_name text,
  description text not null,
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;
alter table news_hints enable row level security;
alter table admin_actions enable row level security;

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
