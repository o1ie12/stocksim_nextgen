import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getNews } from "@/lib/gameData";
import { Nav } from "@/components/Nav";
import { STOCK_BG_CLASS } from "@/lib/stockColorClasses";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default async function NewsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const news = await getNews();

  const byDate = new Map<string, typeof news>();
  for (const item of news) {
    const label = dateLabel(item.createdAt);
    const list = byDate.get(label) ?? [];
    list.push(item);
    byDate.set(label, list);
  }
  const dates = [...byDate.keys()];

  return (
    <>
      <Nav role={session.role} name={session.name} />
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-8">
        <h1 className="font-display uppercase text-3xl tracking-tight">News Feed</h1>

        {dates.length === 0 && (
          <p className="nb-border nb-shadow bg-paper p-6 text-center text-sm uppercase tracking-wide font-bold">
            No news yet.
          </p>
        )}

        {dates.map((date) => (
          <section key={date} className="flex flex-col gap-3">
            <h2 className="font-display uppercase text-lg tracking-tight border-b-[3px] border-ink pb-1">
              {date}
            </h2>
            <ul className="flex flex-col gap-2">
              {byDate.get(date)!.map((item) => (
                <li key={item.id} className="nb-border nb-shadow-sm bg-paper p-3 flex items-start gap-3">
                  {item.stockKey ? (
                    <span
                      className={`nb-border ${STOCK_BG_CLASS[item.stockKey]} shrink-0 px-2 py-1 text-[10px] font-display uppercase tracking-tight`}
                    >
                      {item.stockName}
                    </span>
                  ) : (
                    <span className="nb-border bg-ink text-paper shrink-0 px-2 py-1 text-[10px] font-display uppercase tracking-tight">
                      Market
                    </span>
                  )}
                  <span className="text-sm sm:text-base">{item.headline}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
