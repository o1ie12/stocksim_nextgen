"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STOCK_BG_CLASS } from "@/lib/stockColorClasses";
import type { StockKey } from "@/lib/stocksMeta";

export interface AdminStockRow {
  id: string;
  key: StockKey;
  name: string;
  currentPrice: number;
}

function PriceRow({ stock }: { stock: AdminStockRow }) {
  const router = useRouter();
  const [value, setValue] = useState(String(stock.currentPrice));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const price = Math.floor(Number(value));
    if (!Number.isInteger(price) || price <= 0) {
      setError("Whole number > 0");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/set-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId: stock.id, price }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed");
      else router.refresh();
    } catch {
      setError("Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`nb-border ${STOCK_BG_CLASS[stock.key]} px-2 py-1.5 text-xs font-display uppercase tracking-tight w-28 shrink-0 truncate`}>
        {stock.name}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="nb-border w-24 px-2 py-1.5 font-mono-num text-sm"
      />
      <button
        onClick={save}
        disabled={loading}
        className="nb-border nb-shadow-sm nb-press bg-ink text-paper px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-40"
      >
        Save
      </button>
      {error && <span className="text-down text-xs font-bold">{error}</span>}
    </div>
  );
}

export function AdminPriceEditor({ stocks }: { stocks: AdminStockRow[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {stocks.map((s) => (
        // Keying on the price too forces a remount (and a fresh initial
        // value) whenever it changes underneath us — e.g. this page sat
        // open while a week advanced — so "Save" can never silently
        // replay a stale number.
        <PriceRow key={`${s.id}-${s.currentPrice}`} stock={s} />
      ))}
    </div>
  );
}
