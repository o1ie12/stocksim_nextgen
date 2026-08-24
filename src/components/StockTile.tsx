import Link from "next/link";
import { money } from "@/lib/format";
import { STOCK_BG_CLASS } from "@/lib/stockColorClasses";
import type { StockKey } from "@/lib/stocksMeta";
import { ChangeBadge } from "./ChangeBadge";

export interface StockTileData {
  key: StockKey;
  name: string;
  price: number;
  pctChange: number | null;
  flash?: "up" | "down" | null;
}

// The signature element: every stock renders as this same fixed-shape card
// everywhere it appears (market grid, holdings rows, news feed), so kids
// recognize "their" stocks by color instantly without re-reading labels.
export function StockTile({ stock, href }: { stock: StockTileData; href?: string }) {
  const flashClass = stock.flash === "up" ? "flash-up" : stock.flash === "down" ? "flash-down" : "";
  const body = (
    <div
      className={`nb-border nb-shadow ${STOCK_BG_CLASS[stock.key]} ${flashClass} flex flex-col justify-between gap-3 p-4 h-full`}
    >
      <div className="font-display uppercase tracking-tight text-lg leading-none text-ink truncate">
        {stock.name}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <div className="font-mono-num font-bold text-2xl text-ink">{money(stock.price)}</div>
        {stock.pctChange !== null && <ChangeBadge value={stock.pctChange} />}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full nb-press">
        {body}
      </Link>
    );
  }
  return body;
}
