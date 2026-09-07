import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminEditorData, getNews, getAdminActions } from "@/lib/gameData";
import { Nav } from "@/components/Nav";
import { AdminPriceEditor } from "@/components/admin/AdminPriceEditor";
import { AdminPlayerEditor } from "@/components/admin/AdminPlayerEditor";
import { AdminNewsEditor } from "@/components/admin/AdminNewsEditor";

export default async function TeacherAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "teacher") redirect("/dashboard");

  const [{ stocks, players, holdingsByPlayer }, news, adminActions] = await Promise.all([
    getAdminEditorData(),
    getNews(),
    getAdminActions(),
  ]);

  return (
    <>
      <Nav role="teacher" name={session.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-10">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="font-display uppercase text-3xl tracking-tight">Admin Tools</h1>
          <a
            href="/teacher"
            className="nb-border nb-shadow-sm nb-press bg-paper px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
          >
            ← Back to Teacher Panel
          </a>
        </div>
        <p className="text-sm -mt-6 opacity-70">
          This is the whole game loop: change a stock&apos;s price or add a news headline whenever you want. Every
          change here is logged below with who did it and when.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="font-display uppercase text-xl tracking-tight border-b-[3px] border-ink pb-1">
            Stock Prices
          </h2>
          <AdminPriceEditor stocks={stocks} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display uppercase text-xl tracking-tight border-b-[3px] border-ink pb-1">
            Player Cash &amp; Holdings
          </h2>
          <AdminPlayerEditor players={players} stocks={stocks} holdingsByPlayer={holdingsByPlayer} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display uppercase text-xl tracking-tight border-b-[3px] border-ink pb-1">
            News Log
          </h2>
          <AdminNewsEditor
            news={news.map((n) => ({ id: n.id, headline: n.headline, stockName: n.stockName, createdAt: n.createdAt }))}
            stocks={stocks}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display uppercase text-xl tracking-tight border-b-[3px] border-ink pb-1">
            Trade Log Exports
          </h2>
          <p className="text-xs uppercase tracking-wide font-bold opacity-70">
            Every trade + the student&apos;s stated reasoning, as a CSV — the raw material for the end-of-program
            report.
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <a
                key={p.id}
                href={`/api/admin/export-trades?playerId=${p.id}&playerName=${encodeURIComponent(p.name)}`}
                className="nb-border nb-shadow-sm nb-press bg-paper px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
              >
                {p.name} ↓
              </a>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display uppercase text-xl tracking-tight border-b-[3px] border-ink pb-1">
            Admin Action Log
          </h2>
          <div className="flex flex-col gap-1.5 text-sm">
            {adminActions.map((a) => (
              <div key={a.id} className="border-b border-ink/10 pb-1.5 flex gap-2">
                <span className="text-xs font-mono-num opacity-60 shrink-0">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide shrink-0">{a.teacherName ?? "?"}</span>
                <span>{a.description}</span>
              </div>
            ))}
            {adminActions.length === 0 && (
              <p className="text-xs uppercase tracking-wide font-bold">No manual edits yet.</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
