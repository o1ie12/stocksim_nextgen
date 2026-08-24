import type { StockKey } from "./stocksMeta";

// Tailwind's scanner needs literal class strings, not `bg-${key}` templates,
// so every stock's classes are spelled out here explicitly.
export const STOCK_BG_CLASS: Record<StockKey, string> = {
  snackbox: "bg-snackbox",
  threadline: "bg-threadline",
  petpal: "bg-petpal",
  bobaco: "bg-bobaco",
  aerodrone: "bg-aerodrone",
  pixelworks: "bg-pixelworks",
  novamed: "bg-novamed",
  greengrid: "bg-greengrid",
  voltup: "bg-voltup",
  cloudnine: "bg-cloudnine",
};

export const STOCK_TEXT_CLASS: Record<StockKey, string> = {
  snackbox: "text-snackbox",
  threadline: "text-threadline",
  petpal: "text-petpal",
  bobaco: "text-bobaco",
  aerodrone: "text-aerodrone",
  pixelworks: "text-pixelworks",
  novamed: "text-novamed",
  greengrid: "text-greengrid",
  voltup: "text-voltup",
  cloudnine: "text-cloudnine",
};
