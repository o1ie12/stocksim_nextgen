"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STOCK_BG_CLASS } from "@/lib/stockColorClasses";
import type { StockKey } from "@/lib/stocksMeta";

export interface AdminPlayerRow {
  id: string;
  name: string;
  cash: number;
}

export interface AdminStockOption {
  id: string;
  key: StockKey;
  name: string;
}

export function AdminPlayerEditor({
  players,
  stocks,
  holdingsByPlayer,
}: {
  players: AdminPlayerRow[];
  stocks: AdminStockOption[];
  holdingsByPlayer: Record<string, Record<string, number>>;
}) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const player = players.find((p) => p.id === playerId) ?? null;

  const [cashValue, setCashValue] = useState(String(player?.cash ?? 0));
  const [cashError, setCashError] = useState<string | null>(null);
  const [cashLoading, setCashLoading] = useState(false);

  const holdings = useMemo(() => holdingsByPlayer[playerId] ?? {}, [holdingsByPlayer, playerId]);

  function selectPlayer(id: string) {
    setPlayerId(id);
    const p = players.find((pl) => pl.id === id);
    setCashValue(String(p?.cash ?? 0));
    setCashError(null);
  }

  async function saveCash() {
    const cash = Math.floor(Number(cashValue));
    if (!Number.isInteger(cash) || cash < 0) {
      setCashError("Whole number ≥ 0");
      return;
    }
    setCashLoading(true);
    setCashError(null);
    try {
      const res = await fetch("/api/admin/set-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, cash }),
      });
      const data = await res.json();
      if (!res.ok) setCashError(data.error ?? "Failed");
      else router.refresh();
    } catch {
      setCashError("Failed");
    } finally {
      setCashLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        value={playerId}
        onChange={(e) => selectPlayer(e.target.value)}
        className="nb-border bg-paper px-3 py-2 text-sm font-bold uppercase"
      >
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {player && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-bold w-16 shrink-0">Cash</span>
            <input
              type="number"
              value={cashValue}
              onChange={(e) => setCashValue(e.target.value)}
              className="nb-border w-28 px-2 py-1.5 font-mono-num text-sm"
            />
            <button
              onClick={saveCash}
              disabled={cashLoading}
              className="nb-border nb-shadow-sm nb-press bg-ink text-paper px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-40"
            >
              Save
            </button>
            {cashError && <span className="text-down text-xs font-bold">{cashError}</span>}
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {stocks.map((s) => (
              <HoldingRow key={s.id} playerId={playerId} stock={s} initialShares={holdings[s.id] ?? 0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HoldingRow({
  playerId,
  stock,
  initialShares,
}: {
  playerId: string;
  stock: AdminStockOption;
  initialShares: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialShares));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const shares = Math.floor(Number(value));
    if (!Number.isInteger(shares) || shares < 0) {
      setError("Whole number ≥ 0");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/set-holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, stockId: stock.id, shares }),
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
        className="nb-border w-20 px-2 py-1.5 font-mono-num text-sm"
      />
      <button
        onClick={save}
        disabled={loading}
        className="nb-border nb-shadow-sm nb-press bg-paper px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-40"
      >
        Save
      </button>
      {error && <span className="text-down text-xs font-bold">{error}</span>}
    </div>
  );
}
