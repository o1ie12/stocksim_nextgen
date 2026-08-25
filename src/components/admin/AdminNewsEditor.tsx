"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminNewsItem {
  id: string;
  weekNumber: number;
  headline: string;
  stockName: string | null;
}

export interface AdminStockOption {
  id: string;
  name: string;
}

export function AdminNewsEditor({ news, stocks }: { news: AdminNewsItem[]; stocks: AdminStockOption[] }) {
  const router = useRouter();

  const [newWeek, setNewWeek] = useState("1");
  const [newStockId, setNewStockId] = useState("");
  const [newHeadline, setNewHeadline] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  async function addNews() {
    const weekNumber = Math.floor(Number(newWeek));
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || !newHeadline.trim()) {
      setAddError("Need a week number and a headline");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber, stockId: newStockId || null, headline: newHeadline.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setAddError(data.error ?? "Failed");
      else {
        setNewHeadline("");
        router.refresh();
      }
    } catch {
      setAddError("Failed");
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="nb-border bg-paper p-3 flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest font-bold">Add headline</span>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="number"
            value={newWeek}
            onChange={(e) => setNewWeek(e.target.value)}
            className="nb-border w-16 px-2 py-1.5 font-mono-num text-sm"
            aria-label="Week number"
          />
          <select
            value={newStockId}
            onChange={(e) => setNewStockId(e.target.value)}
            className="nb-border px-2 py-1.5 text-sm"
          >
            <option value="">Market (no stock)</option>
            {stocks.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newHeadline}
            onChange={(e) => setNewHeadline(e.target.value)}
            placeholder="Headline text"
            className="nb-border flex-1 min-w-[200px] px-2 py-1.5 text-sm"
          />
          <button
            onClick={addNews}
            disabled={addLoading}
            className="nb-border nb-shadow-sm nb-press bg-ink text-paper px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {addError && <span className="text-down text-xs font-bold">{addError}</span>}
      </div>

      <div className="flex flex-col gap-2">
        {news.map((n) => (
          // Keying on the headline too forces a remount (fresh initial
          // value) if it changed underneath us — e.g. another teacher
          // edited it — so "Save" can never silently replay a stale draft.
          <NewsRow key={`${n.id}-${n.headline}`} item={n} />
        ))}
        {news.length === 0 && <p className="text-xs uppercase tracking-wide font-bold">No news yet.</p>}
      </div>
    </div>
  );
}

function NewsRow({ item }: { item: AdminNewsItem }) {
  const router = useRouter();
  const [headline, setHeadline] = useState(item.headline);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!headline.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/news", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, headline: headline.trim() }),
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

  async function remove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/news?id=${item.id}`, { method: "DELETE" });
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
    <div className="nb-border bg-paper p-2 flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wide nb-border bg-ink text-paper px-1.5 py-0.5 shrink-0">
        Wk {item.weekNumber}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-60 shrink-0 w-20 truncate">
        {item.stockName ?? "Market"}
      </span>
      <input
        type="text"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        className="nb-border flex-1 min-w-[160px] px-2 py-1 text-sm"
      />
      <button
        onClick={save}
        disabled={loading}
        className="nb-border nb-shadow-sm nb-press bg-ink text-paper px-2 py-1 text-[10px] font-bold uppercase disabled:opacity-40"
      >
        Save
      </button>
      <button
        onClick={remove}
        disabled={loading}
        className="nb-border nb-shadow-sm nb-press bg-paper px-2 py-1 text-[10px] font-bold uppercase disabled:opacity-40"
      >
        Delete
      </button>
      {error && <span className="text-down text-xs font-bold">{error}</span>}
    </div>
  );
}
