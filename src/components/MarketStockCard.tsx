"use client";

import { useState } from "react";
import { StockTile, type StockTileData } from "./StockTile";
import { PriceChart, type PricePoint } from "./PriceChart";

export function MarketStockCard({
  stock,
  color,
  history,
}: {
  stock: StockTileData;
  color: string;
  history: PricePoint[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <StockTile stock={stock} />
      <button
        onClick={() => setExpanded((e) => !e)}
        className="nb-border nb-shadow-sm nb-press bg-paper py-1.5 text-xs font-bold uppercase tracking-wide"
      >
        {expanded ? "Hide chart" : "View chart"}
      </button>
      {expanded ? (
        <div className="nb-border nb-shadow bg-paper p-2">
          <PriceChart data={history} color={color} variant="full" />
        </div>
      ) : (
        <div className="nb-border nb-shadow-sm bg-paper p-1">
          <PriceChart data={history} color={color} variant="sparkline" />
        </div>
      )}
    </div>
  );
}
