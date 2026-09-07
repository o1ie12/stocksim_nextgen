import { pct, signedMoney } from "@/lib/format";

export function ChangeBadge({
  value,
  dollarValue,
  size = "md",
}: {
  value: number;
  dollarValue?: number;
  size?: "sm" | "md";
}) {
  const isUp = value > 0;
  const isFlat = value === 0;
  const colorClass = isFlat ? "text-ink" : isUp ? "text-up" : "text-down";
  const arrow = isFlat ? "▪" : isUp ? "▲" : "▼";
  const pad = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm";
  const label = dollarValue !== undefined ? `${signedMoney(dollarValue)} (${pct(value)})` : pct(value);

  return (
    <span
      className={`nb-border bg-paper inline-flex items-center gap-1 font-mono-num font-bold ${colorClass} ${pad}`}
      aria-label={`${isFlat ? "unchanged" : isUp ? "up" : "down"} ${label}`}
    >
      <span aria-hidden="true">{arrow}</span>
      {label}
    </span>
  );
}
