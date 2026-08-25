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
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const player = players.find((p) => p.id === playerId) ?? null;

  const holdings = useMemo(() => holdingsByPlayer[playerId] ?? {}, [holdingsByPlayer, playerId]);

  return (
    <div className="flex flex-col gap-4">
      <select
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
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
          {/* Keying on cash too forces a remount (fresh initial value)
              whenever it changes underneath us — switching players, or this
              page sitting open across a trade/week-advance/other edit — so
              "Save" can never silently replay a stale number. */}
          <CashEditor key={`${player.id}-${player.cash}`} playerId={player.id} initialCash={player.cash} />

          <div className="grid sm:grid-cols-2 gap-2">
            {stocks.map((s) => (
              <HoldingRow
                key={`${playerId}-${s.id}-${holdings[s.id] ?? 0}`}
                playerId={playerId}
                stock={s}
                initialShares={holdings[s.id] ?? 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CashEditor({ playerId, initialCash }: { playerId: string; initialCash: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialCash));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cash = Math.floor(Number(value));
    if (!Number.isInteger(cash) || cash < 0) {
      setError("Whole number ≥ 0");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/set-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, cash }),
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
      <span className="text-xs uppercase tracking-widest font-bold w-16 shrink-0">Cash</span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="nb-border w-28 px-2 py-1.5 font-mono-num text-sm"
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
