"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RosterEntry {
  id: string;
  name: string;
}

export function LoginClient() {
  const router = useRouter();
  const [role, setRole] = useState<"player" | "teacher">("player");
  const [players, setPlayers] = useState<RosterEntry[]>([]);
  const [teachers, setTeachers] = useState<RosterEntry[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/roster")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPlayers(data.players ?? []);
        setTeachers(data.teachers ?? []);
      })
      .catch(() => setRosterError("Couldn't load the roster. Check your connection and reload."));
  }, []);

  function chooseRole(next: "player" | "teacher") {
    setRole(next);
    setSelected(null);
    setPin("");
    setError(null);
  }

  function choosePerson(person: RosterEntry) {
    setSelected(person);
    setPin("");
    setError(null);
  }

  async function submitPin(fullPin: string) {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, id: selected.id, pin: fullPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setPin("");
        setLoading(false);
        return;
      }
      router.push(data.role === "teacher" ? "/teacher" : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setPin("");
      setLoading(false);
    }
  }

  function pressDigit(d: string) {
    if (loading || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submitPin(next);
  }

  function backspace() {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
  }

  const list = role === "player" ? players : teachers;

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="font-display uppercase text-4xl text-center mb-2 tracking-tight">
          Founder&apos;s Track Market
        </h1>
        <p className="text-center text-sm uppercase tracking-wide font-bold mb-8">Sign in to trade</p>

        <div className="flex nb-border nb-shadow mb-6 overflow-hidden">
          <button
            onClick={() => chooseRole("player")}
            className={`flex-1 py-3 font-display uppercase tracking-wide text-lg ${
              role === "player" ? "bg-ink text-paper" : "bg-paper text-ink"
            }`}
          >
            Player
          </button>
          <button
            onClick={() => chooseRole("teacher")}
            className={`flex-1 py-3 font-display uppercase tracking-wide text-lg border-l-[3px] border-ink ${
              role === "teacher" ? "bg-ink text-paper" : "bg-paper text-ink"
            }`}
          >
            Teacher
          </button>
        </div>

        {rosterError && (
          <p className="nb-border nb-shadow bg-paper p-4 text-down font-bold text-center mb-6">{rosterError}</p>
        )}

        {!selected ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {list.map((person) => (
              <button
                key={person.id}
                onClick={() => choosePerson(person)}
                className="nb-border nb-shadow-sm nb-press bg-paper py-4 px-3 font-display uppercase text-base tracking-tight"
              >
                {person.name}
              </button>
            ))}
            {list.length === 0 && !rosterError && (
              <p className="col-span-full text-center text-sm uppercase tracking-wide font-bold py-8">
                Loading roster…
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <p className="font-display uppercase text-2xl tracking-tight">{selected.name}</p>
            <p className="text-xs uppercase tracking-wide font-bold">Enter your 4-digit PIN</p>

            <div className="flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`nb-border w-12 h-14 flex items-center justify-center font-mono-num text-2xl font-bold ${
                    i < pin.length ? "bg-ink text-paper" : "bg-paper"
                  }`}
                >
                  {i < pin.length ? "•" : ""}
                </div>
              ))}
            </div>

            {error && <p className="text-down font-bold text-sm uppercase tracking-wide">{error}</p>}
            {loading && <p className="text-sm uppercase tracking-wide font-bold">Checking…</p>}

            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => pressDigit(d)}
                  disabled={loading}
                  className="nb-border nb-shadow-sm nb-press bg-paper py-4 font-mono-num text-xl font-bold disabled:opacity-40"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelected(null);
                  setPin("");
                  setError(null);
                }}
                className="nb-border nb-shadow-sm nb-press bg-paper py-4 text-xs font-bold uppercase"
              >
                Back
              </button>
              <button
                onClick={() => pressDigit("0")}
                disabled={loading}
                className="nb-border nb-shadow-sm nb-press bg-paper py-4 font-mono-num text-xl font-bold disabled:opacity-40"
              >
                0
              </button>
              <button
                onClick={backspace}
                disabled={loading}
                className="nb-border nb-shadow-sm nb-press bg-paper py-4 text-xs font-bold uppercase disabled:opacity-40"
              >
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
