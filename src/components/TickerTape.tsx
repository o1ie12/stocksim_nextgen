"use client";

import { useEffect, useState } from "react";
import { signedMoney, money, pct } from "@/lib/format";
import { STOCK_TICKER, type StockKey } from "@/lib/stocksMeta";

interface TickerStock {
  key: StockKey;
  name: string;
  currentPrice: number;
  pctChangeRecent: number;
  dollarChangeRecent: number;
}

// A live-feeling strip of every stock's price, like the tape on a real
// exchange. Polls the public ticker endpoint rather than needing a session,
// so it can also show on the login screen.
export function TickerTape() {
  const [stocks, setStocks] = useState<TickerStock[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/market/ticker");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.stocks)) setStocks(data.stocks);
      } catch {
        // Silently skip a failed refresh; the tape just keeps showing stale data.
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (stocks.length === 0) return null;

  const entries = [...stocks, ...stocks];

  return (
    <div className="nb-border border-x-0 bg-paper overflow-hidden">
      <div className="ticker-track flex w-max">
        {entries.map((s, i) => {
          const isUp = s.pctChangeRecent > 0;
          const isFlat = s.pctChangeRecent === 0;
          const colorClass = isFlat ? "text-ink" : isUp ? "text-up" : "text-down";
          const arrow = isFlat ? "▪" : isUp ? "▲" : "▼";
          return (
            <div
              key={`${s.key}-${i}`}
              className="flex items-center gap-2 px-4 py-1.5 text-xs whitespace-nowrap border-r border-ink/20"
            >
              <span className="font-mono-num font-bold">{STOCK_TICKER[s.key]}</span>
              <span className="font-mono-num">{money(s.currentPrice)}</span>
              <span className={`font-mono-num font-bold ${colorClass}`}>
                {arrow} {signedMoney(s.dollarChangeRecent)} ({pct(s.pctChangeRecent)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
