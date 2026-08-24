import { money } from "@/lib/format";
import { ChangeBadge } from "./ChangeBadge";

export interface LeaderboardRow {
  id: string;
  name: string;
  totalValue: number;
  pctGain: number;
}

export function LeaderboardBar({ row, rank, maxValue }: { row: LeaderboardRow; rank: number; maxValue: number }) {
  const widthPct = maxValue > 0 ? Math.max(4, (row.totalValue / maxValue) * 100) : 4;

  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-xl w-8 text-right shrink-0">{rank}</span>
      <div className="flex-1 nb-border bg-paper relative h-14 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-ink"
          style={{ width: `${widthPct}%` }}
          aria-hidden="true"
        />
        <div className="relative h-full flex items-center justify-between px-4 gap-3">
          <span
            className="font-display uppercase tracking-tight text-base truncate"
            style={{ color: widthPct > 28 ? "var(--color-paper)" : "var(--color-ink)" }}
          >
            {row.name}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className="font-mono-num font-bold text-sm"
              style={{ color: widthPct > 72 ? "var(--color-paper)" : "var(--color-ink)" }}
            >
              {money(row.totalValue)}
            </span>
            <ChangeBadge value={row.pctGain} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
