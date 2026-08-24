import { money, shares as fmtShares } from "@/lib/format";
import { STOCK_TEXT_CLASS } from "@/lib/stockColorClasses";
import type { StockKey } from "@/lib/stocksMeta";

export interface HoldingRowData {
  key: StockKey;
  name: string;
  shares: number;
  currentPrice: number;
  value: number;
  gainLoss?: number | null;
}

export function HoldingsTable({ rows }: { rows: HoldingRowData[] }) {
  if (rows.length === 0) {
    return (
      <div className="nb-border nb-shadow bg-paper p-6 text-sm uppercase tracking-wide font-bold text-center">
        No holdings yet — head to the Market to buy your first shares.
      </div>
    );
  }

  return (
    <div className="nb-border nb-shadow bg-paper overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="border-b-[3px] border-ink text-xs uppercase tracking-widest">
            <th className="text-left px-4 py-3">Stock</th>
            <th className="text-right px-4 py-3">Shares</th>
            <th className="text-right px-4 py-3">Price</th>
            <th className="text-right px-4 py-3">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-ink/20 last:border-0">
              <td className={`px-4 py-3 font-display uppercase tracking-tight ${STOCK_TEXT_CLASS[r.key]}`}>
                {r.name}
              </td>
              <td className="px-4 py-3 text-right font-mono-num">{fmtShares(r.shares)}</td>
              <td className="px-4 py-3 text-right font-mono-num">{money(r.currentPrice)}</td>
              <td className="px-4 py-3 text-right font-mono-num font-bold">{money(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
