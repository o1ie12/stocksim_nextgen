-- Round 3: the Reset Game function, and compare-and-swap versions of the
-- Admin Tools overrides for a real (server-enforced) stale-edit guard.
-- Run once in the Supabase SQL editor.

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
