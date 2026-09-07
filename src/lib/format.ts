// Whole dollars only, everywhere — no cents, per the sim's core constraint.
export function money(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(amount)).toLocaleString("en-US")}`;
}

export function pct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// Same as money(), but with an explicit "+" for gains — real tickers show
// dollar change and percent change side by side, not just percent.
export function signedMoney(amount: number): string {
  const rounded = Math.round(amount);
  return rounded > 0 ? `+${money(rounded)}` : money(rounded);
}

export function shares(count: number): string {
  return count.toLocaleString("en-US");
}
