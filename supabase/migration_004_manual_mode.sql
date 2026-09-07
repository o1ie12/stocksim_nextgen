-- Round 4: fully manual mode. Removes the scripted week engine, the
-- Advance Week concept, and the indirect news mechanic entirely. A teacher
-- now changes a stock's price or adds a news headline whenever they want,
-- from Admin Tools — no week counter, no auto rolls, no auto news.
-- Run once in the Supabase SQL editor.

-- ---------- replace functions first (none of the new bodies reference
-- market_state or any week_number column, so it's safe to drop those next) ----------

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

  insert into transactions (player_id, stock_id, action, shares, price, reasoning)
    values (p_player_id, p_stock_id, p_action, p_shares, v_price, p_reasoning);

  return json_build_object('ok', true, 'price', v_price, 'cost', v_cost);
end;
$$;

create or replace function reset_game() returns json
language plpgsql
as $$
begin
  update stocks set current_price = starting_price where true;
  delete from holdings where true;
  update players set cash = 5000 where true;
  delete from price_history where true;
  delete from news_log where true;
  delete from transactions where true;

  insert into price_history (stock_id, price)
    select id, starting_price from stocks;

  return json_build_object('ok', true);
end;
$$;

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
  insert into price_history (stock_id, price) values (p_stock_id, p_new_price);

  return json_build_object('ok', true, 'name', v_name);
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

-- ---------- drop the week/scripted-engine schema ----------

drop table if exists news_hints;
drop table if exists market_state;

alter table price_history drop column if exists week_number cascade;
alter table news_log drop column if exists week_number cascade;
alter table transactions drop column if exists week_number cascade;

-- ---------- fresh price_history baseline ----------
-- price_history no longer carries a week number, so give every stock a
-- single current baseline row to chart from (old per-week rows are gone
-- along with the column they depended on).
delete from price_history where true;
insert into price_history (stock_id, price)
  select id, current_price from stocks;
