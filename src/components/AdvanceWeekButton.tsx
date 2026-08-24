"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TOTAL_WEEKS } from "@/lib/marketEngine";

export function AdvanceWeekButton({ currentWeek }: { currentWeek: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string[] | null>(null);
  const atFinalWeek = currentWeek >= TOTAL_WEEKS;

  async function confirmAdvance() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/advance-week", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to advance week");
      } else {
        setSummary(data.news?.map((n: { headline: string }) => n.headline) ?? []);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <div className="nb-border nb-shadow bg-paper p-6 flex flex-col gap-4">
      <div>
        <span className="text-xs uppercase tracking-widest font-bold">Current Week</span>
        <p className="font-display text-5xl tracking-tight">{currentWeek} / {TOTAL_WEEKS}</p>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={loading || atFinalWeek}
          className="nb-border nb-shadow nb-press bg-ink text-paper py-5 font-display uppercase tracking-wide text-xl disabled:opacity-40"
        >
          {atFinalWeek ? "Final week reached" : `Advance to Week ${currentWeek + 1}`}
        </button>
      ) : (
        <div className="nb-border bg-paper p-4 flex flex-col gap-3">
          <p className="text-sm font-bold uppercase tracking-wide">
            Advance from Week {currentWeek} to Week {currentWeek + 1}? This rolls all prices and can&apos;t be undone.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={confirmAdvance}
              disabled={loading}
              className="nb-border nb-shadow-sm nb-press bg-ink text-paper py-3 font-display uppercase tracking-wide disabled:opacity-40"
            >
              {loading ? "Advancing…" : "Yes, advance"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="nb-border nb-shadow-sm nb-press bg-paper text-ink py-3 font-display uppercase tracking-wide disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-down font-bold text-sm">{error}</p>}
      {summary && (
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wide text-xs mb-1">This week&apos;s news:</p>
          <ul className="list-disc list-inside flex flex-col gap-0.5">
            {summary.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
