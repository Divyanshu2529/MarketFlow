"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type RevenueChartProps = {
  data: {
    year: string;
    revenue: number;
  }[];
};

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((item) => ({
    year: item.year,
    revenue: Number((item.revenue / 1_000_000_000).toFixed(1)),
  }));

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Revenue Growth
        </h2>
        <p className="text-sm text-slate-500">
          Annual revenue trend in billions USD.
        </p>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}