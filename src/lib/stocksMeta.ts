// The fixed universe of 10 fake companies. This is reference data that never
// changes at runtime — prices live in the DB, everything else lives here so
// every screen renders the same identity (name/color) for a given stock.
export type StockKey =
  | "snackbox"
  | "threadline"
  | "petpal"
  | "bobaco"
  | "aerodrone"
  | "pixelworks"
  | "novamed"
  | "greengrid"
  | "voltup"
  | "cloudnine";

export interface StockMeta {
  key: StockKey;
  name: string;
  startingPrice: number;
  personality: string;
  color: string;
  sortOrder: number;
}

export const STOCKS_META: StockMeta[] = [
  { key: "snackbox", name: "SnackBox", startingPrice: 60, personality: "cheap, boring, reliable", color: "#F4A300", sortOrder: 1 },
  { key: "threadline", name: "ThreadLine", startingPrice: 80, personality: "trendy, hype-driven spikes", color: "#E63946", sortOrder: 2 },
  { key: "petpal", name: "PetPal", startingPrice: 100, personality: "steady with seasonal bumps", color: "#588157", sortOrder: 3 },
  { key: "bobaco", name: "BoBaCo", startingPrice: 130, personality: "steady grower, low drama", color: "#A26769", sortOrder: 4 },
  { key: "aerodrone", name: "AeroDrone", startingPrice: 160, personality: "high-risk, biggest swings", color: "#3A86FF", sortOrder: 5 },
  { key: "pixelworks", name: "PixelWorks", startingPrice: 200, personality: "volatile, swings hard both ways", color: "#8338EC", sortOrder: 6 },
  { key: "novamed", name: "NovaMed", startingPrice: 220, personality: "biotech moonshot, speculative, spikes or flops hard", color: "#FF006E", sortOrder: 7 },
  { key: "greengrid", name: "GreenGrid", startingPrice: 240, personality: "slow-build, pays off late", color: "#2A9D8F", sortOrder: 8 },
  { key: "voltup", name: "VoltUp", startingPrice: 280, personality: "big-money feel, high starting price", color: "#FB8500", sortOrder: 9 },
  { key: "cloudnine", name: "CloudNine", startingPrice: 330, personality: 'the "blue chip," slow and steady', color: "#457B9D", sortOrder: 10 },
];

export const FALLBACK_DIP_KEY: StockKey = "snackbox";
export const FALLBACK_HYPE_KEY: StockKey = "threadline";
export const FALLBACK_HYPE_KEY_2: StockKey = "pixelworks"; // used if fallback hype (threadline) is itself the dip stock
