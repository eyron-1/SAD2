import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import SystemLogo from '../ui/SystemLogo';
import PublicAIAssistant from '../ai/PublicAIAssistant';
import { ArrowLeft, Bot, Building2, LayoutDashboard, PieChart, FolderKanban, Users, MessageSquarePlus, LogIn, ShieldCheck, ClipboardList, FileText } from 'lucide-react';

export default function PublicLayout() {
  const { slug } = useParams();
  const location = useLocation();
  const { barangay } = usePublicBarangay(slug);
  const isSkPortal = location.pathname.includes(`/b/${slug}/sk`);
  const isAskAIPage = location.pathname.endsWith('/ask-ai');

  const logoUrl = isSkPortal ? barangay?.sk_logo_url : barangay?.logo_url;
  const portalName = isSkPortal ? `${barangay?.name || 'Barangay'} SK` : barangay?.name || 'Barangay Portal';
  const portalBase = isSkPortal ? `/b/${slug}/sk` : `/b/${slug}`;
  const nav = isSkPortal
    ? [
        { to: '', label: 'SK Overview', icon: LayoutDashboard, end: true },
        { to: 'budget', label: 'SK Budget & Expenses', icon: PieChart },
        { to: 'programs', label: 'SK Youth Programs', icon: FolderKanban },
        { to: 'officials', label: 'SK Officials', icon: Users },
        { to: 'documents', label: 'SK Documents', icon: FileText },
        { to: 'profiling', label: 'KK Profiling', icon: ClipboardList },
        { to: 'feedback', label: 'Send SK Feedback', icon: MessageSquarePlus },
        { to: 'ask-ai', label: 'Ask AI', icon: Bot },
      ]
    : [
        { to: '', label: 'Barangay Overview', icon: LayoutDashboard, end: true },
        { to: 'budget', label: 'Barangay Budget & Expenses', icon: PieChart },
        { to: 'programs', label: 'Barangay Programs & Projects', icon: FolderKanban },
        { to: 'documents', label: 'Public Documents', icon: FileText },
        { to: 'officials', label: 'Elected Officials', icon: Users },
        { to: 'feedback', label: 'Send Feedback', icon: MessageSquarePlus },
        { to: 'ask-ai', label: 'Ask AI', icon: Bot },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-civic-navy focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="bg-civic-dark/95 backdrop-blur-md text-white border-b border-white/10 sticky top-0 z-40 shadow-lg shadow-slate-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-0.5 flex items-center justify-center border border-white/20 overflow-hidden shadow-inner">
              {logoUrl ? (
                <img src={logoUrl} alt={portalName} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <SystemLogo className="w-full h-full object-cover rounded-lg" />
              )}
            </div>
            <Link to={isSkPortal ? `/b/${slug}/sk` : `/b/${slug}`} className="group min-w-0">
              <h1 className="font-bold text-base md:text-lg text-white leading-tight flex items-center gap-2 min-w-0">
                <span className="truncate">{portalName}</span>
                <ShieldCheck className="w-4 h-4 text-civic-emerald" />
              </h1>
              <p className="text-[11px] text-slate-300 font-medium">{isSkPortal ? 'SK Youth Transparency Portal' : 'Barangay Government Transparency Portal'}</p>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/15 transition-all whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-civic-emerald" />
              Back to Home
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/15 transition-all whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 text-civic-emerald" />
              Official Login
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10 bg-white">
          <nav
            aria-label="Choose public portal"
            className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5 text-sm sm:px-6 lg:px-8"
          >
            <Link
              to={`/b/${slug}`}
              aria-current={!isSkPortal ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
                !isSkPortal
                  ? 'bg-civic-navy text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-civic-navy'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Barangay Portal
            </Link>
            <Link
              to={`/b/${slug}/sk`}
              aria-current={isSkPortal ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
                isSkPortal
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
              }`}
            >
              <Users className="h-4 w-4" />
              SK Portal
            </Link>
          </nav>
        </div>

        <div className="bg-slate-950/30 border-t border-white/10">
          <nav aria-label="Public portal navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1.5 overflow-x-auto py-2 text-xs [scrollbar-width:none]">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={`${portalBase}${item.to ? `/${item.to}` : ''}`}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-civic-navy font-bold shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex="-1" className="flex-1 max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 w-full focus:outline-none">
        <div className="public-page-content">
          <Outlet />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200/80 text-center text-xs text-slate-500 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-civic-emerald" />
            Published under the Philippine Barangay Full Disclosure Policy (DILG)
          </p>
          <p className="text-slate-400">Data directly verified and published by official barangay administrators.</p>
        </div>
      </footer>
      {!isAskAIPage && <PublicAIAssistant barangay={barangay} />}
    </div>
  );
}
