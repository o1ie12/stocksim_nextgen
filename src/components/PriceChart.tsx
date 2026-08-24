"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { money } from "@/lib/format";

export interface PricePoint {
  week: number;
  price: number;
}

export function PriceChart({
  data,
  color,
  variant = "full",
}: {
  data: PricePoint[];
  color: string;
  variant?: "sparkline" | "full";
}) {
  if (variant === "sparkline") {
    return (
      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#11111122" vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={(w) => `W${w}`}
            tick={{ fontFamily: "var(--font-mono-num)", fontSize: 12, fill: "#111111" }}
            axisLine={{ stroke: "#111111" }}
            tickLine={{ stroke: "#111111" }}
          />
          <YAxis
            tickFormatter={(v) => money(v)}
            tick={{ fontFamily: "var(--font-mono-num)", fontSize: 12, fill: "#111111" }}
            axisLine={{ stroke: "#111111" }}
            tickLine={{ stroke: "#111111" }}
            width={64}
          />
          <Tooltip
            formatter={(value) => [money(Number(value)), "Price"]}
            labelFormatter={(w) => `Week ${w}`}
            contentStyle={{ border: "2px solid #111111", borderRadius: 0, fontFamily: "var(--font-body)" }}
          />
          <Line type="monotone" dataKey="price" stroke={color} strokeWidth={3} dot={{ r: 3, fill: color }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
