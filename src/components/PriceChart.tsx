"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { money } from "@/lib/format";

export interface PricePoint {
  price: number;
  recordedAt: string;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

// Padded around the actual data instead of recharts' default (which, for a
// single point or a tight cluster, stretches the axis toward zero and
// leaves the line/dot looking stranded near the top of an empty chart).
function paddedMin(dataMin: number): number {
  return Math.max(0, Math.floor(dataMin * 0.85));
}
function paddedMax(dataMax: number): number {
  return Math.ceil(dataMax * 1.15);
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
  // Index-based x position: price updates land whenever a teacher makes
  // one, not on a fixed schedule, so plotting by update order (rather than
  // raw timestamp) keeps points evenly spaced and readable.
  const points = data.map((d, i) => ({ i, price: d.price, recordedAt: d.recordedAt }));
  const single = points.length === 1;

  if (variant === "sparkline") {
    return (
      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <YAxis hide domain={[paddedMin, paddedMax]} />
            {single ? (
              <Line
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={0}
                dot={{ r: 3, fill: color }}
                isAnimationActive={false}
              />
            ) : (
              <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#11111122" vertical={false} />
          <XAxis
            dataKey="i"
            tickFormatter={(i) => shortDate(points[i]?.recordedAt ?? "")}
            tick={{ fontFamily: "var(--font-mono-num)", fontSize: 12, fill: "#111111" }}
            axisLine={{ stroke: "#111111" }}
            tickLine={{ stroke: "#111111" }}
            allowDecimals={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[paddedMin, paddedMax]}
            tickFormatter={(v) => money(v)}
            tick={{ fontFamily: "var(--font-mono-num)", fontSize: 12, fill: "#111111" }}
            axisLine={{ stroke: "#111111" }}
            tickLine={{ stroke: "#111111" }}
            width={64}
          />
          <Tooltip
            formatter={(value) => [money(Number(value)), "Price"]}
            labelFormatter={(i) => shortDate(points[Number(i)]?.recordedAt ?? "")}
            contentStyle={{ border: "2px solid #111111", borderRadius: 0, fontFamily: "var(--font-body)" }}
          />
          {single ? (
            <Line
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={0}
              dot={{ r: 5, fill: color }}
              isAnimationActive={false}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={3}
              dot={{ r: 3, fill: color }}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
