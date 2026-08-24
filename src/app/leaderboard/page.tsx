import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getLeaderboard } from "@/lib/gameData";
import { Nav } from "@/components/Nav";
import { LeaderboardBar } from "@/components/LeaderboardBar";

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await getLeaderboard();
  const maxValue = rows.length > 0 ? rows[0].totalValue : 0;

  return (
    <>
      <Nav role={session.role} name={session.name} />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        <h1 className="font-display uppercase text-3xl tracking-tight">Leaderboard</h1>
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <LeaderboardBar key={row.id} row={row} rank={i + 1} maxValue={maxValue} />
          ))}
          {rows.length === 0 && (
            <p className="nb-border nb-shadow bg-paper p-6 text-center text-sm uppercase tracking-wide font-bold">
              No players yet.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
