import { Clock, PlayCircle, CheckCircle2, XCircle, AlertCircle, Eye, FileText } from 'lucide-react';

const CONFIG = {
  planned: { style: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock },
  ongoing: { style: 'bg-amber-50 text-amber-700 border-amber-200/60', icon: PlayCircle },
  completed: { style: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', icon: CheckCircle2 },
  cancelled: { style: 'bg-rose-50 text-rose-700 border-rose-200/60', icon: XCircle },
  new: { style: 'bg-sky-50 text-sky-700 border-sky-200/60', icon: AlertCircle },
  in_review: { style: 'bg-amber-50 text-amber-700 border-amber-200/60', icon: Eye },
  resolved: { style: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', icon: CheckCircle2 },
  closed: { style: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle2 },
  recorded: { style: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText },
  registered: { style: 'bg-indigo-50 text-indigo-700 border-indigo-200/60', icon: Clock },
  active: { style: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', icon: CheckCircle2 },
  dropped: { style: 'bg-rose-50 text-rose-700 border-rose-200/60', icon: XCircle },
};

export default function Badge({ status }) {
  const cfg = CONFIG[status] || { style: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText };
  const Icon = cfg.icon;
  return (
    <span className={`badge uppercase tracking-wider text-[11px] ${cfg.style}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

