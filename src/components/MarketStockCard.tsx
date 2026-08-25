"use client";

import { useState } from "react";
import { StockTile, type StockTileData } from "./StockTile";
import { PriceChart, type PricePoint } from "./PriceChart";

export function MarketStockCard({
  stock,
  color,
  sector,
  description,
  history,
}: {
  stock: StockTileData;
  color: string;
  sector: string;
  description: string;
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
        {expanded ? "Hide details" : "View details"}
      </button>
      {expanded ? (
        <div className="nb-border nb-shadow bg-paper p-3 flex flex-col gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">{sector}</span>
            <p className="text-sm mt-0.5">{description}</p>
          </div>
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
