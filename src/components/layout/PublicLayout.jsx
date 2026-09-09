import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { Building2, LayoutDashboard, PieChart, FolderKanban, Users, MessageSquarePlus, LogIn, ShieldCheck } from 'lucide-react';

const NAV = [
  { to: '', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: 'budget', label: 'Budget & Expenses', icon: PieChart },
  { to: 'programs', label: 'Programs & Projects', icon: FolderKanban },
  { to: 'officials', label: 'Elected Officials', icon: Users },
  { to: 'feedback', label: 'Send Feedback', icon: MessageSquarePlus },
];

export default function PublicLayout() {
  const { slug } = useParams();
  const location = useLocation();
  const { barangay } = usePublicBarangay(slug);
  const isSkPortal = location.pathname.includes(`/b/${slug}/sk`);

  const logoUrl = isSkPortal ? barangay?.sk_logo_url : barangay?.logo_url;
  const portalName = isSkPortal ? `${barangay?.name || 'Barangay'} SK` : barangay?.name || 'Barangay Portal';
  const portalBase = isSkPortal ? `/b/${slug}/sk` : `/b/${slug}`;
  const nav = isSkPortal
    ? [
        { to: '', label: 'SK Overview', icon: LayoutDashboard, end: true },
        { to: 'budget', label: 'SK Budget & Expenses', icon: PieChart },
        { to: 'programs', label: 'SK Youth Programs', icon: FolderKanban },
        { to: 'feedback', label: 'Send SK Feedback', icon: MessageSquarePlus },
        { to: '', label: 'Open Barangay Portal', icon: Building2, base: 'barangay' },
      ]
    : [
        { to: '', label: 'Barangay Overview', icon: LayoutDashboard, end: true },
        { to: 'budget', label: 'Barangay Budget & Expenses', icon: PieChart },
        { to: 'programs', label: 'Barangay Programs & Projects', icon: FolderKanban },
        { to: 'officials', label: 'Elected Officials', icon: Users },
        { to: 'feedback', label: 'Send Feedback', icon: MessageSquarePlus },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      {/* Top Banner Header */}
      <header className="bg-civic-dark text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={isSkPortal ? `/b/${slug}/sk` : `/b/${slug}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-0.5 flex items-center justify-center border border-white/20 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
              {logoUrl ? (
                <img src={logoUrl} alt={portalName} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Building2 className="w-5 h-5 text-civic-emerald" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg text-white leading-tight flex items-center gap-2">
                {portalName}
                <ShieldCheck className="w-4 h-4 text-civic-emerald" />
              </h1>
              <p className="text-[11px] text-slate-300 font-medium">{isSkPortal ? 'SK Youth Transparency Portal' : 'Barangay Government Transparency Portal'}</p>
            </div>
          </Link>

          <Link
            to="/login"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/15 transition-all"
          >
            <LogIn className="w-3.5 h-3.5 text-civic-emerald" />
            Official Login
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-900/60 border-t border-slate-800/80">
          <nav className="max-w-6xl mx-auto px-4 flex gap-1.5 overflow-x-auto text-xs py-1.5">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.base === 'barangay' ? `/b/${slug}` : `${portalBase}${item.to ? `/${item.to}` : ''}`}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-150 ${
                      isActive
                        ? 'bg-civic-emerald text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 text-center text-xs text-slate-500 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-civic-emerald" />
            Published under the Philippine Barangay Full Disclosure Policy (DILG)
          </p>
          <p className="text-slate-400">Data directly verified and published by official barangay administrators.</p>
        </div>
      </footer>
    </div>
  );
}

