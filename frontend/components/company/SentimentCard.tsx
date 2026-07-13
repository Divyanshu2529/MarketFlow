export function SentimentCard() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Market Sentiment</p>

      <div className="mt-6 flex items-center gap-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-emerald-500 bg-emerald-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">82%</p>
            <p className="text-xs text-emerald-600">Positive</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <SentimentRow label="Positive" value="82%" color="bg-emerald-500" />
          <SentimentRow label="Neutral" value="12%" color="bg-amber-400" />
          <SentimentRow label="Negative" value="6%" color="bg-red-500" />
        </div>
      </div>
    </div>
  );
}

function SentimentRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="w-16 text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}