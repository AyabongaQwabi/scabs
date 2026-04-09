"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { label: string; revenue: number };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 min-h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height={256} debounce={50}>
        <LineChart data={data}>
          <XAxis dataKey="label" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="currentColor"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
            }}
          />
          <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

