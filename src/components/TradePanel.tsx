"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { STOCK_BG_CLASS } from "@/lib/stockColorClasses";
import type { StockKey } from "@/lib/stocksMeta";

export interface TradeStockOption {
  id: string;
  key: StockKey;
  name: string;
  currentPrice: number;
}

export function TradePanel({
  stocks,
  holdingsByStockId,
  cash,
}: {
  stocks: TradeStockOption[];
  holdingsByStockId: Record<string, number>;
  cash: number;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(stocks[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = stocks.find((s) => s.id === selectedId) ?? null;
  const ownedShares = selected ? holdingsByStockId[selected.id] ?? 0 : 0;
  const cost = selected ? selected.currentPrice * qty : 0;
  const maxAffordable = selected ? Math.floor(cash / selected.currentPrice) : 0;

  const canBuy = !!selected && qty > 0 && cost <= cash;
  const canSell = !!selected && qty > 0 && qty <= ownedShares;

  function selectStock(id: string) {
    setSelectedId(id);
    setQty(1);
    setError(null);
    setMessage(null);
  }

  function adjustQty(delta: number) {
    setQty((q) => Math.max(1, q + delta));
    setError(null);
    setMessage(null);
  }

  async function trade(action: "buy" | "sell") {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId: selected.id, action, shares: qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Trade failed");
      } else {
        setMessage(`${action === "buy" ? "Bought" : "Sold"} ${qty} share${qty === 1 ? "" : "s"} of ${selected.name}.`);
        setQty(1);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const quickQtys = useMemo(() => [1, 5, 10], []);

  return (
    <div className="nb-border nb-shadow bg-paper p-5 flex flex-col gap-4">
      <span className="text-xs uppercase tracking-widest font-bold">Trade</span>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stocks.map((s) => (
          <button
            key={s.id}
            onClick={() => selectStock(s.id)}
            className={`nb-border nb-press px-2 py-2 text-xs font-display uppercase tracking-tight ${STOCK_BG_CLASS[s.key]} ${
              s.id === selectedId ? "nb-shadow" : "opacity-70"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-mono-num">
              Price: <strong>{money(selected.currentPrice)}</strong>
            </span>
            <span className="font-mono-num">
              You own: <strong>{ownedShares}</strong> share{ownedShares === 1 ? "" : "s"}
            </span>
            <span className="font-mono-num">
              Cash: <strong>{money(cash)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustQty(-1)}
              className="nb-border nb-shadow-sm nb-press w-10 h-10 font-bold text-xl"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="nb-border w-20 h-10 text-center font-mono-num font-bold text-lg"
            />
            <button
              onClick={() => adjustQty(1)}
              className="nb-border nb-shadow-sm nb-press w-10 h-10 font-bold text-xl"
              aria-label="Increase quantity"
            >
              +
            </button>
            <div className="flex gap-2 ml-2">
              {quickQtys.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQty(q);
                    setError(null);
                    setMessage(null);
                  }}
                  className="nb-border nb-shadow-sm nb-press px-2 py-2 text-xs font-bold"
                >
                  {q}
                </button>
              ))}
              <button
                onClick={() => {
                  setQty(Math.max(1, maxAffordable));
                  setError(null);
                  setMessage(null);
                }}
                className="nb-border nb-shadow-sm nb-press px-2 py-2 text-xs font-bold uppercase"
              >
                Max
              </button>
            </div>
          </div>

          <p className="font-mono-num text-sm">
            Order total: <strong>{money(cost)}</strong>
          </p>

          {error && <p className="text-down font-bold text-sm">{error}</p>}
          {message && <p className="text-up font-bold text-sm">{message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => trade("buy")}
              disabled={!canBuy || loading}
              className="nb-border nb-shadow nb-press bg-ink text-paper py-4 font-display uppercase tracking-wide text-lg disabled:opacity-40"
            >
              Buy
            </button>
            <button
              onClick={() => trade("sell")}
              disabled={!canSell || loading}
              className="nb-border nb-shadow nb-press bg-paper text-ink py-4 font-display uppercase tracking-wide text-lg disabled:opacity-40"
            >
              Sell
            </button>
          </div>
        </>
      )}
    </div>
  );
}
