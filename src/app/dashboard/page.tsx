import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPlayerPortfolio } from "@/lib/gameData";
import { Nav } from "@/components/Nav";
import { PortfolioHero } from "@/components/PortfolioHero";
import { HoldingsTable } from "@/components/HoldingsTable";
import { TradePanel } from "@/components/TradePanel";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "player") redirect("/teacher");

  const { player, holdings, holdingsValue, totalValue, allStocks } = await getPlayerPortfolio(session.id);

  const holdingsByStockId = Object.fromEntries(holdings.map((h) => [h.stockId, h.shares]));

  return (
    <>
      <Nav role="player" name={player.name} />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        <PortfolioHero totalValue={totalValue} cash={player.cash} holdingsValue={holdingsValue} />

        <div className="grid lg:grid-cols-[1fr_440px] gap-6 items-start">
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-widest font-bold">Your Holdings</span>
            <HoldingsTable rows={holdings.map((h) => ({ key: h.key, name: h.name, shares: h.shares, currentPrice: h.currentPrice, value: h.value }))} />
          </div>

          <TradePanel
            stocks={allStocks.map((s) => ({ id: s.id, key: s.key, name: s.name, currentPrice: s.currentPrice }))}
            holdingsByStockId={holdingsByStockId}
            cash={player.cash}
          />
        </div>
      </main>
    </>
  );
}
