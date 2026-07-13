export function AIRecommendationCard() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">AI Recommendation</p>

      <h2 className="mt-3 text-3xl font-bold text-emerald-600">
        Strong Buy
      </h2>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-500">Confidence</span>
          <span className="font-semibold text-slate-900">92%</span>
        </div>

        <div className="h-3 rounded-full bg-slate-100">
          <div className="h-3 w-[92%] rounded-full bg-emerald-500" />
        </div>
      </div>

      <p className="mt-6 text-sm leading-6 text-slate-600">
        Apple shows strong cash flow, healthy margins, and consistent EPS
        growth. Long-term outlook remains positive.
      </p>
    </div>
  );
}