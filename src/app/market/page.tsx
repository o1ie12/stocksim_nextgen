import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getStocksWithHistory } from "@/lib/gameData";
import { Nav } from "@/components/Nav";
import { MarketStockCard } from "@/components/MarketStockCard";

export default async function MarketPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { stocks, currentWeek } = await getStocksWithHistory();

  return (
    <>
      <Nav role={session.role} name={session.name} />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="font-display uppercase text-3xl tracking-tight">Market</h1>
          <span className="text-xs uppercase tracking-widest font-bold">Week {currentWeek} of 9</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stocks.map((s) => (
            <MarketStockCard
              key={s.id}
              stock={{ key: s.key, name: s.name, price: s.currentPrice, pctChange: s.pctChangeThisWeek }}
              color={s.color}
              history={s.history}
            />
          ))}
        </div>
      </main>
    </>
  );
}
