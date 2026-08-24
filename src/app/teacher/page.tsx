import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMarketState, getAllPortfoliosForTeacher } from "@/lib/gameData";
import { Nav } from "@/components/Nav";
import { AdvanceWeekButton } from "@/components/AdvanceWeekButton";
import { money, shares as fmtShares } from "@/lib/format";
import { STOCK_BG_CLASS } from "@/lib/stockColorClasses";

export default async function TeacherPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "teacher") redirect("/dashboard");

  const [marketState, portfolios] = await Promise.all([getMarketState(), getAllPortfoliosForTeacher()]);
  const sorted = [...portfolios].sort((a, b) => b.totalValue - a.totalValue);

  return (
    <>
      <Nav role="teacher" name={session.name} />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        <h1 className="font-display uppercase text-3xl tracking-tight">Teacher Panel</h1>

        <AdvanceWeekButton currentWeek={marketState.current_week} />

        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-widest font-bold">All Players (read-only)</span>
          <div className="nb-border nb-shadow bg-paper overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b-[3px] border-ink text-xs uppercase tracking-widest">
                  <th className="text-left px-4 py-3">Player</th>
                  <th className="text-left px-4 py-3">Holdings</th>
                  <th className="text-right px-4 py-3">Cash</th>
                  <th className="text-right px-4 py-3">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-b border-ink/20 last:border-0 align-top">
                    <td className="px-4 py-3 font-display uppercase tracking-tight whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {p.holdings.length === 0 && <span className="opacity-50 text-xs">—</span>}
                        {p.holdings.map((h) => (
                          <span
                            key={h.key}
                            className={`nb-border ${STOCK_BG_CLASS[h.key]} px-1.5 py-0.5 text-[10px] font-mono-num font-bold`}
                          >
                            {h.key.slice(0, 4).toUpperCase()} ×{fmtShares(h.shares)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num whitespace-nowrap">{money(p.cash)}</td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold whitespace-nowrap">{money(p.totalValue)}</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs uppercase tracking-wide font-bold">
                      No players yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
