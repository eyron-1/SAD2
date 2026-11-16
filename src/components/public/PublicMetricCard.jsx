export default function PublicMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "emerald",
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <article className="group min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-civic-emerald/40 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        {Icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone] || tones.emerald}`}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="mt-4 break-words text-xl font-bold leading-tight tracking-tight text-civic-navy tabular-nums sm:text-2xl">
        {value}
      </p>
      {detail && <p className="mt-2 text-sm leading-relaxed text-slate-500">{detail}</p>}
    </article>
  );
}
