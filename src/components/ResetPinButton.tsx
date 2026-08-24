"use client";

import { useState } from "react";

export function ResetPinButton({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doReset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to reset PIN");
      } else {
        setNewPin(data.pin);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (newPin) {
    return (
      <div className="nb-border bg-ink text-paper px-2 py-1.5 text-xs font-mono-num font-bold whitespace-nowrap">
        New PIN: {newPin}
        <div className="font-body font-normal normal-case text-[10px] opacity-80 mt-0.5">Write it down now</div>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={doReset}
          disabled={loading}
          className="nb-border nb-shadow-sm nb-press bg-ink text-paper px-2 py-1.5 text-[10px] font-bold uppercase disabled:opacity-40"
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="nb-border nb-shadow-sm nb-press bg-paper text-ink px-2 py-1.5 text-[10px] font-bold uppercase disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setConfirming(true)}
        className="nb-border nb-shadow-sm nb-press bg-paper text-ink px-2 py-1.5 text-[10px] font-bold uppercase whitespace-nowrap"
      >
        Reset PIN
      </button>
      {error && <span className="text-down text-[10px] font-bold">{error}</span>}
      <span className="sr-only">Reset PIN for {playerName}</span>
    </div>
  );
}
