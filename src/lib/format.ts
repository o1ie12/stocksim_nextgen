// Whole dollars only, everywhere — no cents, per the sim's core constraint.
export function money(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(amount)).toLocaleString("en-US")}`;
}

export function pct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function shares(count: number): string {
  return count.toLocaleString("en-US");
}
