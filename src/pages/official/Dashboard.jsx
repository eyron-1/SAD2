import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSupabaseTable } from "../../lib/useSupabaseTable";
import { roleLabel } from "../../utils/roles";
import ErrorBanner from "../../components/ui/ErrorBanner";
import SystemLogo from "../../components/ui/SystemLogo";
import {
  forecastAnnualSpend,
  sumAmounts,
  sumActiveAmounts,
} from "../../lib/financial";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  FolderKanban,
  Landmark,
  MessageSquare,
  PieChart,
  Receipt,
  ShieldCheck,
  TrendingUp,
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
    to: "reports",
    label: "Reports & analytics",
    description: "Review and export barangay performance.",
    icon: BarChart3,
  },
  {
    to: "ai-assistant",
    label: "AI assistant",
    description: "Get help preparing plans and documents.",
    icon: Bot,
  },
  {
    to: "funds",
    label: "Record fund source",
    description: "Track grants, allotments, and donations.",
    icon: Landmark,
  },
  {
    to: "officials",
    label: "Officials & handover",
    description: "Manage officials and transition records.",
    icon: Users,
  },
];

function MetricCard({ to, label, value, detail, icon: Icon, tone, progress }) {
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
      {progress !== undefined && (
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Total budget spent"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{detail}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-civic-emerald" />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { rows: allocations, error: e1 } = useSupabaseTable(
    "budget_allocations",
    profile?.barangay_id,
  );
  const { rows: funds, error: e7 } = useSupabaseTable(
    "fund_sources",
    profile?.barangay_id,
  );
  const { rows: expenses, error: e2 } = useSupabaseTable(
    "expenses",
    profile?.barangay_id,
  );
  const { rows: programs, error: e3 } = useSupabaseTable(
    "programs",
    profile?.barangay_id,
  );
  const { rows: feedback, error: e4 } = useSupabaseTable(
    "feedback",
    profile?.barangay_id,
  );
  const { rows: notifications, error: e5 } = useSupabaseTable(
    "notifications",
    profile?.barangay_id,
    { filter: { user_id: profile?.id } },
  );
  const { rows: activities, error: e6 } = useSupabaseTable(
    "activity_calendar",
    profile?.barangay_id,
    { orderBy: "starts_at", ascending: true },
  );

  const totalBudget = sumAmounts(allocations);
  const totalFunds = sumAmounts(funds);
  const totalSpent = sumActiveAmounts(expenses);
  const ongoingPrograms = programs.filter((p) => p.status === "ongoing").length;
  const newFeedback = feedback.filter((f) => f.status === "new").length;
  const currentDate = new Date();
  const currentYear = String(currentDate.getFullYear());
  const yearBudget = sumAmounts(
    allocations.filter((row) => String(row.fiscal_year) === currentYear),
  );
  const yearSpend = sumActiveAmounts(
    expenses.filter((row) => row.date_incurred?.startsWith(currentYear)),
  );
  const yearForecast = forecastAnnualSpend(yearSpend, currentDate.getMonth() + 1);
  const forecastOverBudget = yearBudget > 0 && yearForecast > yearBudget;
  const highUtilization = yearBudget > 0 && yearSpend / yearBudget >= 0.85;
  const unreadCount = notifications.filter((row) => !row.read_at).length;
  const upcomingActivities = activities
    .filter((row) => new Date(row.starts_at) >= currentDate)
    .slice(0, 3);
  const spendPercentage =
    totalBudget > 0
      ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
      : 0;
  const logoUrl = profile?.barangays?.logo_url;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-civic-navy via-[#153a59] to-civic-slate p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
        <div className="absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-civic-emerald/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Barangay management
              <span className="text-white/40">/</span>
              {roleLabel(profile?.role)}
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
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
              to="reports"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-civic-navy shadow-sm transition hover:bg-blue-50"
            >
              View reports
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <div className="hidden h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1 sm:flex">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${profile?.barangays?.name || "Barangay"} logo`}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <SystemLogo className="h-full w-full rounded-xl object-cover" />
              )}
            </div>
          </div>
        </div>
      </section>

      <ErrorBanner message={e1 || e2 || e3 || e4 || e5 || e6 || e7} />

      <section aria-label="Barangay overview">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-civic-navy">At a glance</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Key figures across your barangay operations
            </p>
          </div>
          <span className="hidden text-xs font-medium text-slate-400 sm:block">
            Live records
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            to="funds"
            label="Funds sourced"
            value={formatCurrency(totalFunds)}
            detail={`${funds.length} recorded sources`}
            icon={Landmark}
            tone="bg-violet-50 text-violet-700"
          />
          <MetricCard
            to="budget"
            label="Total allocated"
            value={formatCurrency(totalBudget)}
            detail={`${allocations.length} allocation records`}
            icon={PieChart}
            tone="bg-blue-50 text-blue-700"
          />
          <MetricCard
            to="expenses"
            label="Total spent"
            value={formatCurrency(totalSpent)}
            detail={`${spendPercentage}% of total budget`}
            icon={Receipt}
            tone="bg-amber-50 text-amber-700"
            progress={spendPercentage}
          />
          <MetricCard
            to="programs"
            label="Ongoing programs"
            value={ongoingPrograms}
            detail={`${programs.length} projects in total`}
            icon={FolderKanban}
            tone="bg-emerald-50 text-emerald-700"
          />
          <MetricCard
            to="feedback"
            label="New feedback"
            value={newFeedback}
            detail={`${feedback.length} resident responses`}
            icon={MessageSquare}
            tone="bg-rose-50 text-rose-700"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div
          className={`rounded-2xl border bg-white p-5 shadow-sm lg:col-span-3 sm:p-6 ${
            forecastOverBudget || highUtilization
              ? "border-amber-200"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Financial health
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-civic-navy">
                <TrendingUp className="h-5 w-5 text-civic-emerald" />
                {currentYear} budget outlook
              </h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                forecastOverBudget
                  ? "bg-rose-50 text-rose-700"
                  : highUtilization
                    ? "bg-amber-50 text-amber-800"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {forecastOverBudget
                ? "Needs attention"
                : highUtilization
                  ? "High utilization"
                  : "On track"}
            </span>
          </div>
          {yearBudget > 0 ? (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Spent to date
                  </p>
                  <p className="mt-1 text-xl font-bold text-civic-navy">
                    {formatCurrency(yearSpend)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Projected year-end spend
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold ${
                      forecastOverBudget ? "text-rose-700" : "text-civic-navy"
                    }`}
                  >
                    {formatCurrency(yearForecast)}
                  </p>
                </div>
              </div>
              <p
                className={`mt-4 text-sm leading-relaxed ${
                  forecastOverBudget || highUtilization
                    ? "text-amber-800"
                    : "text-slate-500"
                }`}
              >
                {forecastOverBudget
                  ? "At the current spending pace, expenses may exceed this year's allocation."
                  : highUtilization
                    ? "More than 85% of this year's allocation has been spent."
                    : "Current spending is within the annual allocation."}{" "}
                Forecast annualizes spending across elapsed months.
              </p>
            </>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No {currentYear} allocation is recorded for this forecast.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Calendar
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-civic-navy">
                <CalendarDays className="h-5 w-5 text-civic-emerald" />
                Upcoming activities
              </h2>
            </div>
            <Link
              to="operations"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-civic-emerald"
              aria-label="Open operations"
            >
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {upcomingActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3 py-3 first:pt-0">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-civic-emerald" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {activity.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(activity.starts_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {upcomingActivities.length === 0 && (
              <p className="py-4 text-sm text-slate-500">
                No upcoming activities scheduled.
              </p>
            )}
          </div>
          <Link
            to="operations"
            className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3 text-sm transition hover:bg-emerald-50"
          >
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <Bell className="h-4 w-4 text-civic-emerald" />
              Notifications
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-civic-navy shadow-sm">
              {unreadCount} unread
            </span>
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-civic-navy">Quick actions</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Common tools to keep your barangay moving
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ to, label, description, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-civic-emerald/40 hover:shadow-card-hover"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-civic-emerald">
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
          <Link
            to="operations"
            className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-civic-emerald/40 hover:shadow-card-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800">
                Operations & audit
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                Review activity logs and scheduled operations.
              </span>
            </span>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-civic-emerald" />
          </Link>
        </div>
      </section>
    </div>
  );
}
