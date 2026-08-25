"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetGameButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setConfirming(true);
    setConfirmText("");
    setError(null);
  }

  function cancel() {
    setConfirming(false);
    setConfirmText("");
    setError(null);
  }

  async function confirmReset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reset-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to reset");
      } else {
        setConfirming(false);
        setConfirmText("");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nb-border border-down nb-shadow bg-paper p-6 flex flex-col gap-3">
      <span className="text-xs uppercase tracking-widest font-bold text-down">Danger Zone</span>

      {!confirming ? (
        <>
          <p className="text-sm">
            Wipes prices, cash, holdings, and news back to a clean Week 1 — for starting a new group. Student and
            teacher logins are not affected.
          </p>
          <button
            onClick={open}
            className="nb-border border-down nb-shadow-sm nb-press bg-paper text-down py-3 font-display uppercase tracking-wide self-start px-6"
          >
            Reset Game
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold">
            This is irreversible: every stock resets to its starting price, all cash resets to $5,000, all holdings
            are cleared, and the news log is wiped. Type <span className="font-mono-num">RESET</span> to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET"
            className="nb-border border-down w-40 px-3 py-2 font-mono-num text-lg"
          />
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              onClick={confirmReset}
              disabled={confirmText !== "RESET" || loading}
              className="nb-border border-down nb-shadow-sm nb-press bg-down text-paper py-3 font-display uppercase tracking-wide disabled:opacity-40"
            >
              {loading ? "Resetting…" : "Confirm Reset"}
            </button>
            <button
              onClick={cancel}
              disabled={loading}
              className="nb-border nb-shadow-sm nb-press bg-paper text-ink py-3 font-display uppercase tracking-wide disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-down font-bold text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
}
