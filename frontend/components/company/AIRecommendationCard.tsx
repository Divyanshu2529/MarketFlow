type AIRecommendationCardProps = {
  recommendation: string;
  confidence: number;
  reasoning: string;
};

export function AIRecommendationCard({
  recommendation,
  confidence,
  reasoning,
}: AIRecommendationCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        AI Recommendation
      </p>

      <h2 className="mt-3 text-3xl font-bold text-emerald-600">
        {recommendation}
      </h2>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-500">
            Confidence
          </span>

          <span className="font-semibold text-slate-900">
            {confidence}%
          </span>
        </div>

        <div className="h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-emerald-500"
            style={{
              width: `${confidence}%`,
            }}
          />
        </div>
      </div>

      <p className="mt-6 text-sm leading-6 text-slate-600">
        {reasoning}
      </p>
    </div>
  );
}