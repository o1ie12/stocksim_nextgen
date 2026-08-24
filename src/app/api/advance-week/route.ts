import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";
import { assignDipAndHype, computeWeekMove, TOTAL_WEEKS, type EngineStock, type HoldingsSnapshotEntry } from "@/lib/marketEngine";

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

  const result = computeWeekMove(newWeek, stocks, dipStockId, hypeStockId);

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

  // Log news.
  if (result.news.length > 0) {
    const newsRows = result.news.map((n) => ({
      week_number: newWeek,
      stock_id: n.stockId,
      headline: n.headline,
    }));
    const { error: newsError } = await supabaseAdmin.from("news_log").insert(newsRows);
    if (newsError) return NextResponse.json({ error: newsError.message }, { status: 500 });
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

  return NextResponse.json({ ok: true, newWeek, moves: result.moves, news: result.news });
}
