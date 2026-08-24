import { money, pct } from "@/lib/format";

export function PortfolioHero({
  totalValue,
  cash,
  holdingsValue,
  startingCash = 5000,
}: {
  totalValue: number;
  cash: number;
  holdingsValue: number;
  startingCash?: number;
}) {
  const gain = ((totalValue - startingCash) / startingCash) * 100;
  const isUp = gain > 0;
  const isFlat = gain === 0;

  return (
    <div className="nb-border nb-shadow bg-paper p-6 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest font-bold">Portfolio Value</span>
      <div className="flex items-baseline gap-4 flex-wrap">
        <span className="font-display text-6xl sm:text-7xl leading-none tracking-tight">{money(totalValue)}</span>
        <span className={`font-mono-num font-bold text-lg ${isFlat ? "text-ink" : isUp ? "text-up" : "text-down"}`}>
          {isFlat ? "▪" : isUp ? "▲" : "▼"} {pct(gain)}
        </span>
      </div>
      <div className="flex gap-6 mt-3 text-sm">
        <div>
          <span className="block text-xs uppercase tracking-widest font-bold opacity-70">Cash</span>
          <span className="font-mono-num font-medium text-lg">{money(cash)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-widest font-bold opacity-70">Holdings</span>
          <span className="font-mono-num font-medium text-lg">{money(holdingsValue)}</span>
        </div>
      </div>
    </div>
  );
}
