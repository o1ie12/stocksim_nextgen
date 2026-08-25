import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";
import {
  assignDipAndHype,
  computeWeekMove,
  pickNewsScenario,
  TOTAL_WEEKS,
  type EngineStock,
  type HoldingsSnapshotEntry,
  type PendingHint,
} from "@/lib/marketEngine";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Only teachers can advance the week" }, { status: 401 });
  }

  const { data: marketState, error: msError } = await supabaseAdmin
    .from("market_state")
    .select("*")
    .eq("id", 1)
    .single();

  if (msError || !marketState) {
    return NextResponse.json({ error: msError?.message ?? "market_state not found" }, { status: 500 });
  }

  const currentWeek = marketState.current_week as number;
  if (currentWeek >= TOTAL_WEEKS) {
    return NextResponse.json({ error: `Already at the final week (${TOTAL_WEEKS})` }, { status: 400 });
  }
  const newWeek = currentWeek + 1;

  const { data: stockRows, error: stocksError } = await supabaseAdmin
    .from("stocks")
    .select("id, key, name, current_price");

  if (stocksError || !stockRows) {
    return NextResponse.json({ error: stocksError?.message ?? "Failed to load stocks" }, { status: 500 });
  }

  const stocks: EngineStock[] = stockRows.map((s) => ({
    id: s.id,
    key: s.key,
    name: s.name,
    currentPrice: s.current_price,
  }));

  let dipStockId = marketState.dip_stock_id as string | null;
  let hypeStockId = marketState.hype_stock_id as string | null;

  // Dip/hype are assigned once, right after week 1 trading closes — i.e. on
  // the very first advance (week 1 -> 2).
  if (!dipStockId || !hypeStockId) {
    const { data: holdingRows, error: holdingsError } = await supabaseAdmin
      .from("holdings")
      .select("stock_id, player_id, shares")
      .gt("shares", 0);

    if (holdingsError) {
      return NextResponse.json({ error: holdingsError.message }, { status: 500 });
    }

    const byStock = new Map<string, { holders: Set<string>; totalShares: number }>();
    for (const h of holdingRows ?? []) {
      const entry = byStock.get(h.stock_id) ?? { holders: new Set<string>(), totalShares: 0 };
      entry.holders.add(h.player_id);
      entry.totalShares += h.shares;
      byStock.set(h.stock_id, entry);
    }

    const snapshot: HoldingsSnapshotEntry[] = stocks.map((s) => {
      const entry = byStock.get(s.id);
      return {
        stockId: s.id,
        holderCount: entry?.holders.size ?? 0,
        totalShares: entry?.totalShares ?? 0,
      };
    });

    const assignment = assignDipAndHype(stocks, snapshot);
    dipStockId = assignment.dipStockId;
    hypeStockId = assignment.hypeStockId;
  }

  // Indirect news economy: resolve whatever was planted last advance, and
  // (except on the final week) plant a fresh hint for next advance to
  // resolve.
  const { data: unconsumedHints, error: hintsError } = await supabaseAdmin
    .from("news_hints")
    .select("id, stock_id, direction")
    .is("consumed_at", null);
  if (hintsError) return NextResponse.json({ error: hintsError.message }, { status: 500 });

  const pendingHints: PendingHint[] = (unconsumedHints ?? []).map((h) => ({
    stockId: h.stock_id,
    direction: h.direction as "up" | "down",
  }));

  const { data: allHintRows, error: allHintsError } = await supabaseAdmin
    .from("news_hints")
    .select("scenario_key");
  if (allHintsError) return NextResponse.json({ error: allHintsError.message }, { status: 500 });
  const usedScenarioKeys = (allHintRows ?? []).map((h) => h.scenario_key);

  const plantScenario = newWeek < TOTAL_WEEKS ? pickNewsScenario(stocks, usedScenarioKeys) : null;

  const result = computeWeekMove(newWeek, stocks, dipStockId, hypeStockId, pendingHints, plantScenario);

  // Apply price updates.
  for (const move of result.moves) {
    const { error } = await supabaseAdmin
      .from("stocks")
      .update({ current_price: move.newPrice })
      .eq("id", move.stockId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log price history for the new week.
  const historyRows = result.moves.map((m) => ({
    stock_id: m.stockId,
    week_number: newWeek,
    price: m.newPrice,
  }));
  const { error: historyError } = await supabaseAdmin.from("price_history").insert(historyRows);
  if (historyError) return NextResponse.json({ error: historyError.message }, { status: 500 });

  // Log news (the explicit dip/hype/novamed storyline headlines).
  if (result.news.length > 0) {
    const newsRows = result.news.map((n) => ({
      week_number: newWeek,
      stock_id: n.stockId,
      headline: n.headline,
    }));
    const { error: newsError } = await supabaseAdmin.from("news_log").insert(newsRows);
    if (newsError) return NextResponse.json({ error: newsError.message }, { status: 500 });
  }

  // Log the indirect headline separately so we can capture its id and link
  // news_hints to it.
  if (result.plantedHint) {
    const { data: hintNewsRow, error: hintNewsError } = await supabaseAdmin
      .from("news_log")
      .insert({ week_number: newWeek, stock_id: null, headline: result.plantedHint.headline })
      .select("id")
      .single();
    if (hintNewsError || !hintNewsRow) {
      return NextResponse.json({ error: hintNewsError?.message ?? "Failed to log hint news" }, { status: 500 });
    }

    const hintRows = result.plantedHint.stockIds.map((stockId) => ({
      news_log_id: hintNewsRow.id,
      stock_id: stockId,
      direction: result.plantedHint!.direction,
      scenario_key: result.plantedHint!.scenarioKey,
      planted_week: newWeek,
    }));
    const { error: insertHintsError } = await supabaseAdmin.from("news_hints").insert(hintRows);
    if (insertHintsError) return NextResponse.json({ error: insertHintsError.message }, { status: 500 });
  }

  // Whatever was pending this round is now resolved, whether or not it
  // actually changed a price (its stock may have had a scripted move of its
  // own this week) — the prediction window was exactly one week.
  if (unconsumedHints && unconsumedHints.length > 0) {
    const { error: consumeError } = await supabaseAdmin
      .from("news_hints")
      .update({ consumed_at: new Date().toISOString() })
      .in("id", unconsumedHints.map((h) => h.id));
    if (consumeError) return NextResponse.json({ error: consumeError.message }, { status: 500 });
  }

  // Update market_state.
  const { error: updateError } = await supabaseAdmin
    .from("market_state")
    .update({
      current_week: newWeek,
      dip_stock_id: dipStockId,
      hype_stock_id: hypeStockId,
      novamed_event: result.novamedEvent ?? marketState.novamed_event,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const allNews = result.plantedHint
    ? [...result.news, { stockId: null, headline: result.plantedHint.headline }]
    : result.news;

  return NextResponse.json({ ok: true, newWeek, moves: result.moves, news: allNews });
}
