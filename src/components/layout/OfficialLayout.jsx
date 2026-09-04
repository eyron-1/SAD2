import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSkRole, isBarangayEditor, isSkEditor, roleLabel } from '../../utils/roles';
import FloatingAIChat from '../ai/FloatingAIChat';
import {
  LayoutDashboard,
  PieChart,
  Receipt,
  Landmark,
  FolderKanban,
  MessageSquare,
  Users,
  BarChart3,
  Bot,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ExternalLink,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

const BARANGAY_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/budget', label: 'Budget Allocation', icon: PieChart },
  { to: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
  { to: '/dashboard/funds', label: 'Fund Sourcing', icon: Landmark },
  { to: '/dashboard/programs', label: 'Programs & Projects', icon: FolderKanban },
  { to: '/dashboard/feedback', label: 'Community Feedback', icon: MessageSquare },
  { to: '/dashboard/officials', label: 'Officials & Handover', icon: Users },
  { to: '/dashboard/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/dashboard/ai-assistant', label: 'AI Assistant', icon: Bot },
  { to: '/dashboard/settings', label: 'Barangay Settings', icon: Settings },
];

const SK_NAV = [
  { to: '/sk', label: 'SK Dashboard', icon: LayoutDashboard },
  { to: '/sk/budget', label: 'SK Budget', icon: PieChart },
  { to: '/sk/programs', label: 'SK Programs', icon: FolderKanban },
  { to: '/sk/kk-monitoring', label: 'KK Youth Monitoring', icon: Users },
  { to: '/sk/ai-assistant', label: 'AI Assistant', icon: Bot },
  { to: '/sk/settings', label: 'Barangay Settings', icon: Settings },
];

export default function OfficialLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const skMember = isSkRole(profile?.role);
  const nav = skMember ? SK_NAV : BARANGAY_NAV;
  const canEdit = skMember ? isSkEditor(profile?.role) : isBarangayEditor(profile?.role);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const bgyName = profile?.barangays?.name || 'Barangay Portal';
  const logoUrl = profile?.barangays?.logo_url;
  const slug = profile?.barangays?.slug;

  return (
    <div className="min-h-screen flex bg-slate-50 font-body">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-civic-dark text-white flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header with Barangay Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/15 overflow-hidden shadow-inner">
            {logoUrl ? (
              <img src={logoUrl} alt={bgyName} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Building2 className="w-6 h-6 text-civic-emerald" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-white truncate leading-tight">{bgyName}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-xs text-slate-300 truncate font-medium">{roleLabel(profile?.role)}</p>
            </div>
            {!canEdit && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 mt-1">
                <ShieldAlert className="w-3 h-3" /> View Only
              </span>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Public View Quick Access */}
        {slug && (
          <div className="px-3 pt-3 pb-1">
            <Link
              to={`/b/${slug}`}
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-civic-emerald" /> Public Resident View
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard' || item.to === '/sk'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-civic-emerald text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer User Info & Sign out */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-civic-emerald/20 text-civic-emerald border border-civic-emerald/30 font-bold text-xs flex items-center justify-center shrink-0">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{profile?.position_title || roleLabel(profile?.role)}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={bgyName} className="w-7 h-7 rounded-md object-cover border border-slate-200" />
              ) : (
                <Building2 className="w-6 h-6 text-civic-navy" />
              )}
              <h1 className="font-bold text-slate-800 text-lg hidden sm:block">{bgyName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={skMember ? '/sk/settings' : '/dashboard/settings'}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              <Settings className="w-3.5 h-3.5 text-civic-emerald" />
              Settings
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <FloatingAIChat />
    </div>
  );
}