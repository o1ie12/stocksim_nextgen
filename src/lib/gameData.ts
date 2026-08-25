import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import type { StockKey } from "./stocksMeta";

export interface StockWithChange {
  id: string;
  key: StockKey;
  name: string;
  color: string;
  sector: string;
  description: string;
  currentPrice: number;
  startingPrice: number;
  pctChangeThisWeek: number;
  history: { week: number; price: number }[];
}

export async function getMarketState() {
  const { data, error } = await supabaseAdmin.from("market_state").select("*").eq("id", 1).single();
  if (error || !data) throw new Error(error?.message ?? "market_state missing");
  return data;
}

export async function getStocksWithHistory(): Promise<{
  stocks: StockWithChange[];
  currentWeek: number;
}> {
  const [{ data: stocks, error: stocksError }, { data: history, error: historyError }, marketState] =
    await Promise.all([
      supabaseAdmin.from("stocks").select("*").order("sort_order"),
      supabaseAdmin.from("price_history").select("*").order("week_number"),
      getMarketState(),
    ]);

  if (stocksError || !stocks) throw new Error(stocksError?.message ?? "Failed to load stocks");
  if (historyError || !history) throw new Error(historyError?.message ?? "Failed to load price history");

  const currentWeek = marketState.current_week as number;

  const enriched: StockWithChange[] = stocks.map((s) => {
    const series = history
      .filter((h) => h.stock_id === s.id)
      .map((h) => ({ week: h.week_number as number, price: h.price as number }));
    const prev = series.find((h) => h.week === currentWeek - 1);
    const pctChangeThisWeek = prev ? ((s.current_price - prev.price) / prev.price) * 100 : 0;

    return {
      id: s.id,
      key: s.key as StockKey,
      name: s.name,
      color: s.color,
      sector: s.sector,
      description: s.description,
      currentPrice: s.current_price,
      startingPrice: s.starting_price,
      pctChangeThisWeek: Math.round(pctChangeThisWeek * 10) / 10,
      history: series,
    };
  });

  return { stocks: enriched, currentWeek };
}

export interface PlayerHolding {
  stockId: string;
  key: StockKey;
  name: string;
  color: string;
  shares: number;
  currentPrice: number;
  value: number;
  costBasisUnknownNote?: never;
}

export async function getPlayerPortfolio(playerId: string) {
  const [{ data: player, error: playerError }, { data: holdings, error: holdingsError }, { stocks }] =
    await Promise.all([
      supabaseAdmin.from("players").select("id, name, cash").eq("id", playerId).single(),
      supabaseAdmin.from("holdings").select("stock_id, shares").eq("player_id", playerId).gt("shares", 0),
      getStocksWithHistory(),
    ]);

  if (playerError || !player) throw new Error(playerError?.message ?? "Player not found");
  if (holdingsError) throw new Error(holdingsError.message);

  const stockById = new Map(stocks.map((s) => [s.id, s]));
  const enrichedHoldings: PlayerHolding[] = (holdings ?? [])
    .map((h) => {
      const stock = stockById.get(h.stock_id);
      if (!stock) return null;
      return {
        stockId: stock.id,
        key: stock.key,
        name: stock.name,
        color: stock.color,
        shares: h.shares,
        currentPrice: stock.currentPrice,
        value: stock.currentPrice * h.shares,
      };
    })
    .filter((h): h is PlayerHolding => h !== null);

  const holdingsValue = enrichedHoldings.reduce((sum, h) => sum + h.value, 0);
  const totalValue = player.cash + holdingsValue;

  return { player, holdings: enrichedHoldings, holdingsValue, totalValue, allStocks: stocks };
}

const STARTING_CASH = 5000;

export async function getLeaderboard() {
  const [{ data: players, error: playersError }, { data: holdings, error: holdingsError }, { stocks }] =
    await Promise.all([
      supabaseAdmin.from("players").select("id, name, cash"),
      supabaseAdmin.from("holdings").select("player_id, stock_id, shares").gt("shares", 0),
      getStocksWithHistory(),
    ]);

  if (playersError || !players) throw new Error(playersError?.message ?? "Failed to load players");
  if (holdingsError) throw new Error(holdingsError.message);

  const priceById = new Map(stocks.map((s) => [s.id, s.currentPrice]));

  const rows = players.map((p) => {
    const holdingsValue = (holdings ?? [])
      .filter((h) => h.player_id === p.id)
      .reduce((sum, h) => sum + (priceById.get(h.stock_id) ?? 0) * h.shares, 0);
    const totalValue = p.cash + holdingsValue;
    const pctGain = ((totalValue - STARTING_CASH) / STARTING_CASH) * 100;
    return { id: p.id, name: p.name, cash: p.cash, holdingsValue, totalValue, pctGain };
  });

  rows.sort((a, b) => b.totalValue - a.totalValue);
  return rows;
}

export interface NewsItemDisplay {
  id: string;
  weekNumber: number;
  headline: string;
  stockKey: StockKey | null;
  stockName: string | null;
  stockColor: string | null;
  createdAt: string;
}

export async function getNews(): Promise<NewsItemDisplay[]> {
  const [{ data: news, error: newsError }, { data: stocks, error: stocksError }] = await Promise.all([
    supabaseAdmin.from("news_log").select("*").order("week_number", { ascending: false }).order("created_at", { ascending: false }),
    supabaseAdmin.from("stocks").select("id, key, name, color"),
  ]);

  if (newsError || !news) throw new Error(newsError?.message ?? "Failed to load news");
  if (stocksError || !stocks) throw new Error(stocksError?.message ?? "Failed to load stocks");

  const stockById = new Map(stocks.map((s) => [s.id, s]));

  return news.map((n) => {
    const stock = n.stock_id ? stockById.get(n.stock_id) : null;
    return {
      id: n.id,
      weekNumber: n.week_number,
      headline: n.headline,
      stockKey: (stock?.key as StockKey) ?? null,
      stockName: stock?.name ?? null,
      stockColor: stock?.color ?? null,
      createdAt: n.created_at,
    };
  });
}

export async function getAllPortfoliosForTeacher() {
  const [{ data: players, error: playersError }, { data: holdings, error: holdingsError }, { stocks }] =
    await Promise.all([
      supabaseAdmin.from("players").select("id, name, cash").order("name"),
      supabaseAdmin.from("holdings").select("player_id, stock_id, shares").gt("shares", 0),
      getStocksWithHistory(),
    ]);

  if (playersError || !players) throw new Error(playersError?.message ?? "Failed to load players");
  if (holdingsError) throw new Error(holdingsError.message);

  const stockById = new Map(stocks.map((s) => [s.id, s]));

  return players.map((p) => {
    const playerHoldings = (holdings ?? [])
      .filter((h) => h.player_id === p.id)
      .map((h) => {
        const stock = stockById.get(h.stock_id)!;
        return { key: stock.key, name: stock.name, color: stock.color, shares: h.shares, value: stock.currentPrice * h.shares };
      });
    const holdingsValue = playerHoldings.reduce((sum, h) => sum + h.value, 0);
    return { id: p.id, name: p.name, cash: p.cash, holdings: playerHoldings, totalValue: p.cash + holdingsValue };
  });
}

export interface TransactionDisplay {
  id: string;
  weekNumber: number;
  stockKey: StockKey;
  stockName: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  reasoning: string | null;
  createdAt: string;
}

export async function getPlayerTransactions(playerId: string): Promise<TransactionDisplay[]> {
  const [{ data: rows, error: txError }, { data: stocks, error: stocksError }] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("player_id", playerId)
      .order("week_number")
      .order("created_at"),
    supabaseAdmin.from("stocks").select("id, key, name"),
  ]);

  if (txError || !rows) throw new Error(txError?.message ?? "Failed to load transactions");
  if (stocksError || !stocks) throw new Error(stocksError?.message ?? "Failed to load stocks");

  const stockById = new Map(stocks.map((s) => [s.id, s]));

  return rows.map((r) => {
    const stock = stockById.get(r.stock_id);
    return {
      id: r.id,
      weekNumber: r.week_number,
      stockKey: (stock?.key as StockKey) ?? "snackbox",
      stockName: stock?.name ?? "Unknown",
      action: r.action,
      shares: r.shares,
      price: r.price,
      reasoning: r.reasoning,
      createdAt: r.created_at,
    };
  });
}

export interface AdminActionDisplay {
  id: string;
  teacherName: string | null;
  description: string;
  createdAt: string;
}

export async function getAdminActions(limit = 50): Promise<AdminActionDisplay[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) throw new Error(error?.message ?? "Failed to load admin actions");

  return data.map((a) => ({
    id: a.id,
    teacherName: a.teacher_name,
    description: a.description,
    createdAt: a.created_at,
  }));
}

export async function logAdminAction(teacherId: string, teacherName: string, description: string) {
  const { error } = await supabaseAdmin
    .from("admin_actions")
    .insert({ teacher_id: teacherId, teacher_name: teacherName, description });
  if (error) throw new Error(error.message);
}

export async function getAdminEditorData() {
  const [{ data: stocks, error: stocksError }, { data: players, error: playersError }, { data: holdings, error: holdingsError }] =
    await Promise.all([
      supabaseAdmin.from("stocks").select("id, key, name, current_price").order("sort_order"),
      supabaseAdmin.from("players").select("id, name, cash").order("name"),
      supabaseAdmin.from("holdings").select("player_id, stock_id, shares").gt("shares", 0),
    ]);

  if (stocksError || !stocks) throw new Error(stocksError?.message ?? "Failed to load stocks");
  if (playersError || !players) throw new Error(playersError?.message ?? "Failed to load players");
  if (holdingsError) throw new Error(holdingsError.message);

  const holdingsByPlayer: Record<string, Record<string, number>> = {};
  for (const h of holdings ?? []) {
    holdingsByPlayer[h.player_id] = holdingsByPlayer[h.player_id] ?? {};
    holdingsByPlayer[h.player_id][h.stock_id] = h.shares;
  }

  return {
    stocks: stocks.map((s) => ({ id: s.id, key: s.key as StockKey, name: s.name, currentPrice: s.current_price })),
    players: players.map((p) => ({ id: p.id, name: p.name, cash: p.cash })),
    holdingsByPlayer,
  };
}

export interface NewsHintDisplay {
  id: string;
  plantedWeek: number;
  headline: string;
  scenarioKey: string;
  direction: "up" | "down";
  stockKey: StockKey;
  stockName: string;
  consumedAt: string | null;
}

// Teacher-only visibility into the indirect news mapping — students never
// see this. Useful for a teacher grading reasoning against what the news
// actually meant.
export async function getNewsHintsForTeacher(): Promise<NewsHintDisplay[]> {
  const [{ data: hints, error: hintsError }, { data: news, error: newsError }, { data: stocks, error: stocksError }] =
    await Promise.all([
      supabaseAdmin.from("news_hints").select("*").order("planted_week", { ascending: false }),
      supabaseAdmin.from("news_log").select("id, headline"),
      supabaseAdmin.from("stocks").select("id, key, name"),
    ]);

  if (hintsError || !hints) throw new Error(hintsError?.message ?? "Failed to load news hints");
  if (newsError || !news) throw new Error(newsError?.message ?? "Failed to load news");
  if (stocksError || !stocks) throw new Error(stocksError?.message ?? "Failed to load stocks");

  const newsById = new Map(news.map((n) => [n.id, n]));
  const stockById = new Map(stocks.map((s) => [s.id, s]));

  return hints.map((h) => {
    const stock = stockById.get(h.stock_id);
    return {
      id: h.id,
      plantedWeek: h.planted_week,
      headline: newsById.get(h.news_log_id ?? "")?.headline ?? "(headline missing)",
      scenarioKey: h.scenario_key,
      direction: h.direction,
      stockKey: (stock?.key as StockKey) ?? "snackbox",
      stockName: stock?.name ?? "Unknown",
      consumedAt: h.consumed_at,
    };
  });
}
