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
  stockId: string | null; // null = market-wide / indirect (no stock revealed)
  headline: string;
}

export interface PlantedHint {
  scenarioKey: string;
  headline: string;
  direction: "up" | "down";
  stockIds: string[];
}

export interface PendingHint {
  stockId: string;
  direction: "up" | "down";
}

export interface WeekMoveResult {
  moves: StockMoveResult[];
  news: NewsItem[];
  novamedEvent: "spike" | "flop" | null;
  plantedHint: PlantedHint | null;
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

// A hint-biased move: still a real random roll, just constrained to the
// direction the planted headline pointed at, within the same magnitude
// band boring weeks already use.
function biasedRandInRange(direction: "up" | "down", magnitude = 5): number {
  return direction === "up" ? randInRange(0.5, magnitude) : -randInRange(0.5, magnitude);
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

// ---------- indirect news economy ----------
// Each scenario names a real-world-feeling event but never the stock or
// direction outright — a student has to connect it to a company via that
// company's own sector/description (see stocksMeta.ts). The mapping here
// is the only place the "answer" lives; nothing student-facing exposes it.
// The event posts this week and its price consequence lands next roll.
export interface NewsScenario {
  key: string;
  headline: string;
  stockKeys: string[]; // 1-2 stocks this scenario is secretly tied to
  direction: "up" | "down";
}

export const NEWS_SCENARIOS: NewsScenario[] = [
  { key: "steel-shortage", headline: "Steel prices spike due to a supply shortage.", stockKeys: ["aerodrone", "voltup"], direction: "down" },
  { key: "fashion-trend-viral", headline: "A new clothing trend is going viral with teens nationwide.", stockKeys: ["threadline"], direction: "up" },
  { key: "cotton-shortage", headline: "This year's cotton harvest came in much smaller than expected.", stockKeys: ["threadline"], direction: "down" },
  { key: "chip-shortage", headline: "A worldwide computer chip shortage is slowing down factories.", stockKeys: ["aerodrone", "pixelworks"], direction: "down" },
  { key: "sugar-price-drop", headline: "Sugar prices dropped after a record harvest this year.", stockKeys: ["snackbox", "bobaco"], direction: "up" },
  { key: "heat-wave", headline: "A major heat wave is sweeping across the country.", stockKeys: ["greengrid"], direction: "up" },
  { key: "lithium-price-climb", headline: "Battery material prices are climbing as demand grows worldwide.", stockKeys: ["voltup"], direction: "down" },
  { key: "cloud-outage", headline: "A major internet outage knocked popular websites offline for hours.", stockKeys: ["cloudnine"], direction: "down" },
  { key: "solar-incentive", headline: "The government just announced new incentives for clean energy.", stockKeys: ["greengrid"], direction: "up" },
  { key: "pet-adoption-boom", headline: "Pet adoptions are way up across the country this season.", stockKeys: ["petpal"], direction: "up" },
  { key: "shipping-slowdown", headline: "A port slowdown is causing shipping delays and rising costs.", stockKeys: ["threadline", "snackbox"], direction: "down" },
  { key: "game-hit", headline: "A new mobile game just hit #1 on download charts nationwide.", stockKeys: ["pixelworks"], direction: "up" },
  { key: "packaging-cost-rise", headline: "Plastic packaging costs are rising across the industry.", stockKeys: ["snackbox", "bobaco"], direction: "down" },
  { key: "grain-disruption", headline: "Bad weather disrupted farming in a major grain-growing region.", stockKeys: ["snackbox"], direction: "down" },
  { key: "health-study-buzz", headline: "A big new health study is making national news this week.", stockKeys: ["novamed"], direction: "up" },
  { key: "trial-delay", headline: "An unnamed lab reported a delay in one of its health trials.", stockKeys: ["novamed"], direction: "down" },
  { key: "gaming-summer-slump", headline: "Kids are heading outdoors for summer, and screen time is dropping.", stockKeys: ["pixelworks"], direction: "down" },
  { key: "vet-ingredient-trend", headline: "A vet-recommended new pet food ingredient is trending online.", stockKeys: ["petpal"], direction: "up" },
];

// Picks a scenario not already used this game (falls back to allowing a
// repeat once the whole pool has been used). Returns null only if none of
// the scenario's stock keys match the current stock list, which shouldn't
// happen with the fixed 10-company universe.
export function pickNewsScenario(stocks: EngineStock[], usedKeys: string[]): PlantedHint | null {
  const byKey = new Map(stocks.map((s) => [s.key, s]));
  const usedSet = new Set(usedKeys);
  const pool = NEWS_SCENARIOS.filter((s) => !usedSet.has(s.key));
  const scenario = pick(pool.length > 0 ? pool : NEWS_SCENARIOS);

  const stockIds = scenario.stockKeys
    .map((k) => byKey.get(k)?.id)
    .filter((id): id is string => Boolean(id));
  if (stockIds.length === 0) return null;

  return { scenarioKey: scenario.key, headline: scenario.headline, direction: scenario.direction, stockIds };
}

// ---------- headline pools (the explicit dip/hype/novamed storyline) ----------
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
  pendingHints: PendingHint[] = [],
  plantScenario: PlantedHint | null = null,
  novamedStockKey = "novamed"
): WeekMoveResult {
  const byId = new Map(stocks.map((s) => [s.id, s]));
  const novamed = stocks.find((s) => s.key === novamedStockKey) ?? null;
  const moves = new Map<string, number>(); // stockId -> pct
  const news: NewsItem[] = [];
  let novamedEvent: "spike" | "flop" | null = null;
  // Stocks with a scripted narrative move this week — a pending hint should
  // never override those, only "plain" stocks.
  const excludedFromHints = new Set<string>();

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
      excludedFromHints.add(dipStockId);
      const others = stocks.filter((s) => s.id !== dipStockId && s.id !== hypeStockId);
      const other = others.length > 0 ? pick(others) : null;
      if (other) {
        setMove(other.id, randInRange(-6, 6));
        excludedFromHints.add(other.id);
      }

      const dip = byId.get(dipStockId)!;
      news.push({ stockId: dip.id, headline: pick(DIP_BAD_NEWS)(dip.name) });
      if (other) news.push({ stockId: other.id, headline: pick(OTHER_UNRELATED_BLIP)(other.name) });
      break;
    }
    case 5: {
      for (const s of stocks) setMove(s.id, 0);
      setMove(dipStockId, randInRange(8, 10));
      setMove(hypeStockId, randInRange(5, 8));
      excludedFromHints.add(dipStockId);
      excludedFromHints.add(hypeStockId);

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
      excludedFromHints.add(dipStockId);
      break;
    }
    case 7: {
      for (const s of stocks) setMove(s.id, 0);
      setMove(hypeStockId, randInRange(15, 20));
      excludedFromHints.add(hypeStockId);
      const hype = byId.get(hypeStockId)!;
      news.push({ stockId: hype.id, headline: pick(HYPE_BREAKOUT)(hype.name) });

      if (novamed && novamed.id !== hypeStockId && novamed.id !== dipStockId) {
        const spike = Math.random() < 0.5;
        novamedEvent = spike ? "spike" : "flop";
        setMove(novamed.id, spike ? randInRange(25, 35) : -randInRange(20, 30));
        excludedFromHints.add(novamed.id);
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
      excludedFromHints.add(hypeStockId);
      const hype = byId.get(hypeStockId)!;
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

  // Apply any hint planted last week: bias the affected stock's roll toward
  // the direction the headline pointed at, unless that stock already has a
  // scripted narrative move of its own this week.
  const freezeWeek = newWeek === 9;
  for (const hint of pendingHints) {
    if (excludedFromHints.has(hint.stockId)) continue;
    if (!byId.has(hint.stockId)) continue;
    setMove(hint.stockId, biasedRandInRange(hint.direction, freezeWeek ? 2 : 5));
  }

  // Note: the planted-hint headline is intentionally NOT added to `news`
  // here — the caller inserts it separately so it can capture that row's id
  // and link it to the news_hints rows it creates from `plantedHint`.

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

  return { moves: results, news, novamedEvent, plantedHint: plantScenario };
}

export const TOTAL_WEEKS = 9;
