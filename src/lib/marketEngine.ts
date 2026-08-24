// Pure, deterministic-shape market engine for the 9-week schedule.
// Kept free of any Supabase/DB imports so the week-move math can be reasoned
// about (and unit tested) in isolation from persistence.
import { FALLBACK_DIP_KEY, FALLBACK_HYPE_KEY, FALLBACK_HYPE_KEY_2 } from "./stocksMeta";

export interface EngineStock {
  id: string;
  key: string;
  name: string;
  currentPrice: number;
}

export interface StockMoveResult {
  stockId: string;
  oldPrice: number;
  newPrice: number;
  pctChange: number; // rounded to 1 decimal, based on actual whole-dollar move
}

export interface NewsItem {
  stockId: string | null; // null = market-wide
  headline: string;
}

export interface WeekMoveResult {
  moves: StockMoveResult[];
  news: NewsItem[];
  novamedEvent: "spike" | "flop" | null;
}

export interface HoldingsSnapshotEntry {
  stockId: string;
  holderCount: number;
  totalShares: number;
}

// ---------- random helpers ----------
function randInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function applyPct(price: number, pct: number): number {
  const next = Math.round(price * (1 + pct / 100));
  return Math.max(1, next);
}

function pctChange(oldPrice: number, newPrice: number): number {
  return Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- dip/hype assignment (run once, after week 1 closes) ----------
export function assignDipAndHype(
  stocks: EngineStock[],
  snapshot: HoldingsSnapshotEntry[]
): { dipStockId: string; hypeStockId: string } {
  const byId = new Map(stocks.map((s) => [s.id, s]));
  const byKey = new Map(stocks.map((s) => [s.key, s]));
  const held = snapshot.filter((s) => s.holderCount > 0);

  if (held.length >= 2) {
    const sorted = [...held].sort((a, b) => {
      if (b.holderCount !== a.holderCount) return b.holderCount - a.holderCount;
      return b.totalShares - a.totalShares;
    });
    const dipStockId = sorted[0].stockId;
    const hypeStockId = sorted.find((s) => s.stockId !== dipStockId)!.stockId;
    return { dipStockId, hypeStockId };
  }

  // Fallback: fewer than 2 stocks have any holders at all.
  const dipStockId =
    held.length === 1 ? held[0].stockId : byKey.get(FALLBACK_DIP_KEY)!.id;

  const fallbackHype = byKey.get(FALLBACK_HYPE_KEY)!;
  const hypeStockId =
    fallbackHype.id !== dipStockId ? fallbackHype.id : byKey.get(FALLBACK_HYPE_KEY_2)!.id;

  void byId; // (kept for symmetry/debuggability, not otherwise needed)
  return { dipStockId, hypeStockId };
}

// ---------- headline pools ----------
const BORING_BLURBS = [
  (name: string) => `${name} ticks up slightly on light trading.`,
  (name: string) => `${name} drifts lower, nothing major behind it.`,
  (name: string) => `${name} holds close to flat this week.`,
];

const DIP_BAD_NEWS = [
  (name: string) => `${name} tumbles after a rough week — investors are spooked.`,
  (name: string) => `${name} drops hard on disappointing news.`,
];

const OTHER_UNRELATED_BLIP = [
  (name: string) => `${name} sees a small unrelated move — nothing to see here.`,
  (name: string) => `${name} wobbles a little on no real news.`,
];

const DIP_RECOVERY = [
  (name: string) => `${name} bounces back as the dust settles.`,
  (name: string) => `${name} climbs back after last week's slide.`,
];

const HYPE_EARLY_BUZZ = [
  (name: string) => `${name} is starting to get buzz — early movers are in.`,
  (name: string) => `${name} ticks up as word starts to spread.`,
];

const HYPE_BREAKOUT = [
  (name: string) => `${name} breaks out! The hype is paying off.`,
  (name: string) => `${name} rockets higher on a wave of buying.`,
];

const NOVAMED_SPIKE = [
  (name: string) => `${name} spikes on a surprise breakthrough announcement!`,
];

const NOVAMED_FLOP = [
  (name: string) => `${name} flops after a trial setback spooks the market.`,
];

const HYPE_COOLDOWN = [
  (name: string) => `${name} pulls back as the hype cools off.`,
  (name: string) => `${name} slides a bit after its big run.`,
];

// ---------- main entry point ----------
export function computeWeekMove(
  newWeek: number,
  stocks: EngineStock[],
  dipStockId: string,
  hypeStockId: string,
  novamedStockKey = "novamed"
): WeekMoveResult {
  const byId = new Map(stocks.map((s) => [s.id, s]));
  const novamed = stocks.find((s) => s.key === novamedStockKey) ?? null;
  const moves = new Map<string, number>(); // stockId -> pct
  const news: NewsItem[] = [];
  let novamedEvent: "spike" | "flop" | null = null;

  const setMove = (id: string, pct: number) => moves.set(id, pct);

  switch (newWeek) {
    case 2:
    case 3: {
      for (const s of stocks) setMove(s.id, randInRange(-5, 5));
      break;
    }
    case 4: {
      for (const s of stocks) setMove(s.id, 0);
      setMove(dipStockId, -randInRange(15, 20));
      const others = stocks.filter((s) => s.id !== dipStockId && s.id !== hypeStockId);
      const other = others.length > 0 ? pick(others) : null;
      if (other) setMove(other.id, randInRange(-6, 6));

      const dip = byId.get(dipStockId)!;
      news.push({ stockId: dip.id, headline: pick(DIP_BAD_NEWS)(dip.name) });
      if (other) news.push({ stockId: other.id, headline: pick(OTHER_UNRELATED_BLIP)(other.name) });
      break;
    }
    case 5: {
      for (const s of stocks) setMove(s.id, 0);
      setMove(dipStockId, randInRange(8, 10));
      setMove(hypeStockId, randInRange(5, 8));

      const dip = byId.get(dipStockId)!;
      const hype = byId.get(hypeStockId)!;
      news.push({ stockId: dip.id, headline: pick(DIP_RECOVERY)(dip.name) });
      news.push({ stockId: hype.id, headline: pick(HYPE_EARLY_BUZZ)(hype.name) });
      break;
    }
    case 6: {
      for (const s of stocks) setMove(s.id, randInRange(-5, 5));
      const dipBase = moves.get(dipStockId) ?? 0;
      const compounded = (1 + dipBase / 100) * (1 + randInRange(3, 5) / 100) - 1;
      setMove(dipStockId, compounded * 100);
      news.push({ stockId: null, headline: "Quiet week in the market — recovery holds." });
      break;
    }
    case 7: {
      for (const s of stocks) setMove(s.id, 0);
      setMove(hypeStockId, randInRange(15, 20));
      const hype = byId.get(hypeStockId)!;
      news.push({ stockId: hype.id, headline: pick(HYPE_BREAKOUT)(hype.name) });

      if (novamed && novamed.id !== hypeStockId && novamed.id !== dipStockId) {
        const spike = Math.random() < 0.5;
        novamedEvent = spike ? "spike" : "flop";
        setMove(novamed.id, spike ? randInRange(25, 35) : -randInRange(20, 30));
        news.push({
          stockId: novamed.id,
          headline: spike ? pick(NOVAMED_SPIKE)(novamed.name) : pick(NOVAMED_FLOP)(novamed.name),
        });
      }
      break;
    }
    case 8: {
      for (const s of stocks) {
        if (s.id !== hypeStockId) setMove(s.id, randInRange(-5, 5));
      }
      setMove(hypeStockId, -randInRange(5, 8));
      const hype = byId.get(hypeStockId)!;
      news.push({ stockId: null, headline: "Quiet week overall." });
      news.push({ stockId: hype.id, headline: pick(HYPE_COOLDOWN)(hype.name) });
      break;
    }
    case 9: {
      for (const s of stocks) setMove(s.id, randInRange(-2, 2));
      news.push({ stockId: null, headline: "Markets settle ahead of final results." });
      break;
    }
    default:
      throw new Error(`No scripted move defined for week ${newWeek}`);
  }

  // Boring weeks (2, 3) get a couple of "notable mover" blurbs; quiet weeks
  // (6, 8) intentionally stay minimal per the schedule ("recovery holds" /
  // "pulls back" already cover it).
  if (newWeek === 2 || newWeek === 3) {
    const ranked = [...moves.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const notable = ranked.slice(0, 2 + Math.round(Math.random()));
    for (const [stockId] of notable) {
      const s = byId.get(stockId)!;
      news.push({ stockId: s.id, headline: pick(BORING_BLURBS)(s.name) });
    }
  }

  const results: StockMoveResult[] = stocks.map((s) => {
    const pct = moves.get(s.id) ?? 0;
    const newPrice = applyPct(s.currentPrice, pct);
    return {
      stockId: s.id,
      oldPrice: s.currentPrice,
      newPrice,
      pctChange: pctChange(s.currentPrice, newPrice),
    };
  });

  return { moves: results, news, novamedEvent };
}

export const TOTAL_WEEKS = 9;
