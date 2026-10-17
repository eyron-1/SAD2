import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSupabaseTable } from "../../lib/useSupabaseTable";
import { roleLabel } from "../../utils/roles";
import ErrorBanner from "../../components/ui/ErrorBanner";
import SystemLogo from "../../components/ui/SystemLogo";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  FolderKanban,
  Landmark,
  MessageSquare,
  PieChart,
  Receipt,
  Settings,
  Users,
} from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const quickActions = [
  {
    to: "budget",
    label: "SK budget allocation",
    description: "Plan and manage youth budget allocations.",
    icon: PieChart,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    to: "expenses",
    label: "SK expenses",
    description: "Record spending and keep receipts organized.",
    icon: Receipt,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    to: "programs",
    label: "Programs & projects",
    description: "Manage youth programs and project budgets.",
    icon: FolderKanban,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    to: "funds",
    label: "Fund sources",
    description: "Track grants, allotments, and donations.",
    icon: Landmark,
    tone: "bg-violet-50 text-violet-700",
  },
  {
    to: "feedback",
    label: "Community feedback",
    description: "Review concerns and ideas from young residents.",
    icon: MessageSquare,
    tone: "bg-rose-50 text-rose-700",
  },
  {
    to: "ai-assistant",
    label: "SK AI assistant",
    description: "Get help drafting resolutions and proposals.",
    icon: Bot,
    tone: "bg-cyan-50 text-cyan-700",
  },
  {
    to: "settings",
    label: "SK profile & settings",
    description: "Update the SK logo and profile details.",
    icon: Settings,
    tone: "bg-slate-100 text-slate-700",
  },
  {
    to: "operations",
    label: "Operations & audit",
    description: "Review SK activity and operations records.",
    icon: CalendarDays,
    tone: "bg-indigo-50 text-indigo-700",
  },
];

function MetricCard({ to, label, value, detail, icon: Icon, tone }) {
  return (
    <Link
      to={to}
      className="group min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-civic-emerald/40 hover:shadow-card-hover focus-visible:outline-offset-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-1 whitespace-nowrap text-xl font-bold tracking-tight text-civic-navy xl:text-base 2xl:text-lg">
        {value}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{detail}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-civic-emerald" />
      </div>
    </Link>
  );
}

export default function SKDashboard() {
  const { profile } = useAuth();
  const { rows: budget, error: e1 } = useSupabaseTable(
    "sk_budget",
    profile?.barangay_id,
  );
  const { rows: funds, error: e2 } = useSupabaseTable(
    "sk_fund_sources",
    profile?.barangay_id,
  );
  const { rows: programs, error: e3 } = useSupabaseTable(
    "sk_programs",
    profile?.barangay_id,
  );
  const { rows: kk, error: e4 } = useSupabaseTable(
    "kk_monitoring",
    profile?.barangay_id,
  );

  const totalBudget = budget.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalFunds = funds.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const activeKK = kk.filter(
    (member) => member.participation_status === "active",
  ).length;
  const activePrograms = programs.filter(
    (program) => program.status === "ongoing",
  ).length;
  const currentDate = new Date();
  const logoUrl = profile?.barangays?.sk_logo_url || profile?.barangays?.logo_url;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-civic-navy via-[#153a59] to-civic-slate p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
        <div className="absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-civic-emerald/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Sangguniang Kabataan
              <span className="text-white/40">/</span>
              {roleLabel(profile?.role)}
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-blue-100/80">
              <span className="font-medium text-white">
                {profile?.barangays?.name || "Barangay"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {currentDate.toLocaleDateString("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="programs"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-civic-navy shadow-sm transition hover:bg-blue-50"
            >
              View programs
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <div className="hidden h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1 sm:flex">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${profile?.barangays?.name || "Barangay"} SK logo`}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <SystemLogo className="h-full w-full rounded-xl object-cover" />
              )}
            </div>
          </div>
        </div>
      </section>

      <ErrorBanner message={e1 || e2 || e3 || e4} />

      <section aria-label="SK overview">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-civic-navy">Youth governance at a glance</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              A snapshot of your SK programs, funds, and community
            </p>
          </div>
          <span className="hidden text-xs font-medium text-slate-400 sm:block">
            Live records
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            to="budget"
            label="SK budget allocated"
            value={formatCurrency(totalBudget)}
            detail={`${budget.length} allocation records`}
            icon={PieChart}
            tone="bg-blue-50 text-blue-700"
          />
          <MetricCard
            to="funds"
            label="Funds sourced"
            value={formatCurrency(totalFunds)}
            detail={`${funds.length} recorded sources`}
            icon={Landmark}
            tone="bg-violet-50 text-violet-700"
          />
          <MetricCard
            to="programs"
            label="Active youth programs"
            value={activePrograms}
            detail={`${programs.length} projects in total`}
            icon={FolderKanban}
            tone="bg-emerald-50 text-emerald-700"
          />
          <MetricCard
            to="kk-monitoring"
            label="Active KK members"
            value={activeKK}
            detail={`${kk.length} youth profiles`}
            icon={Users}
            tone="bg-amber-50 text-amber-700"
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-civic-navy">SK tools & resources</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Jump into the tools you use to serve your community
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ to, label, description, icon: Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-civic-emerald/40 hover:shadow-card-hover"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800">
                  {label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                  {description}
                </span>
              </span>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-civic-emerald" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
