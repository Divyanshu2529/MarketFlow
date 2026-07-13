const competitors = [
  {
    company: "Apple",
    ticker: "AAPL",
    marketCap: "$3.1T",
    revenue: "$383.3B",
    peRatio: 31.4,
    eps: "$6.13",
    margin: "26.3%",
  },
  {
    company: "Microsoft",
    ticker: "MSFT",
    marketCap: "$3.7T",
    revenue: "$245.1B",
    peRatio: 39.2,
    eps: "$12.05",
    margin: "36.4%",
  },
  {
    company: "NVIDIA",
    ticker: "NVDA",
    marketCap: "$2.34T",
    revenue: "$60.9B",
    peRatio: 78.6,
    eps: "$12.08",
    margin: "48.8%",
  },
];

export function CompetitorComparison() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Competitor Comparison
        </h2>

        <p className="text-sm text-slate-500">
          Side-by-side comparison of key financial metrics.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Market Cap</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">P/E</th>
              <th className="px-4 py-3 font-medium">EPS</th>
              <th className="px-4 py-3 font-medium">Profit Margin</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {competitors.map((item) => (
              <tr key={item.ticker} className="hover:bg-purple-50/40">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {item.company}
                  </p>
                  <p className="text-xs text-slate-500">{item.ticker}</p>
                </td>

                <td className="px-4 py-4 text-slate-700">{item.marketCap}</td>
                <td className="px-4 py-4 text-slate-700">{item.revenue}</td>
                <td className="px-4 py-4 text-slate-700">{item.peRatio}</td>
                <td className="px-4 py-4 text-slate-700">{item.eps}</td>
                <td className="px-4 py-4 text-slate-700">{item.margin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}