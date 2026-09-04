import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { friendlySupabaseError } from '../../lib/validation';
import ErrorBanner from '../../components/ui/ErrorBanner';
import {
  Landmark,
  Search,
  ArrowRight,
  ShieldCheck,
  PieChart,
  FolderKanban,
  MessageSquare,
  Users,
  MapPin,
  Sparkles,
  Building2,
  ExternalLink,
  Receipt,
  FileCheck,
  CheckCircle,
  Clock,
  ChevronRight,
  Menu,
  X,
  HeartHandshake
} from 'lucide-react';

export default function Landing() {
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('barangays')
      .select('*')
      .order('name')
      .then(({ data, error: qError }) => {
        if (qError) setError(friendlySupabaseError(qError));
        else setBarangays(data || []);
        setLoading(false);
      });
  }, []);

  const provinces = useMemo(() => {
    const list = barangays.map((b) => b.province).filter(Boolean);
    return ['all', ...Array.from(new Set(list))];
  }, [barangays]);

  const filtered = useMemo(() => {
    return barangays.filter((b) => {
      const matchesSearch =
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.municipality?.toLowerCase().includes(search.toLowerCase()) ||
        b.province?.toLowerCase().includes(search.toLowerCase()) ||
        b.slug?.toLowerCase().includes(search.toLowerCase());

      const matchesProvince =
        selectedProvince === 'all' || b.province === selectedProvince;

      return matchesSearch && matchesProvince;
    });
  }, [barangays, search, selectedProvince]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-body flex flex-col selection:bg-civic-navy selection:text-white">
      {/* Top Civic Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-civic-navy text-civic-gold flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg text-civic-navy tracking-tight">
                  Barangay Transparency
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Open Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Republic of the Philippines · Local Government</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#directory" className="hover:text-civic-navy transition-colors">
              Find Barangay
            </a>
            <a href="#pillars" className="hover:text-civic-navy transition-colors">
              Transparency Pillars
            </a>
            <a href="#how-it-works" className="hover:text-civic-navy transition-colors">
              How It Works
            </a>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-civic-navy px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Official Log In
            </Link>
            <Link
              to="/signup"
              className="btn-emerald text-sm font-semibold py-2 px-4 shadow-sm hover:shadow-md"
            >
              Register Barangay
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
            <a
              href="#directory"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-civic-navy"
            >
              Find Barangay
            </a>
            <a
              href="#pillars"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-civic-navy"
            >
              Transparency Pillars
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-civic-navy"
            >
              How It Works
            </a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                Official Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold text-white bg-civic-leaf rounded-lg"
              >
                Register Barangay
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-civic-navy via-slate-900 to-civic-dark text-white pt-16 pb-24 overflow-hidden">
        {/* Subtle geometric background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C9A24B_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Official Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-civic-gold border border-white/15 text-xs font-semibold backdrop-blur-xs animate-in fade-in slide-in-from-top-4 duration-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>In Accordance with DILG Full Disclosure Policy & RA 7160</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white tracking-tight leading-tight max-w-4xl mx-auto font-bold">
            Transparent Governance for Every Filipino Barangay
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Open budgets, itemized expenditures, community programs, and direct public feedback.
            <span className="text-emerald-400 font-medium"> 100% free and open to all residents</span> with no account required to browse.
          </p>

          {/* Instant Search Bar in Hero */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl p-2 shadow-card-hover border border-slate-200 text-slate-800">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search your barangay, municipality, or province..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2.5 text-sm sm:text-base outline-none bg-transparent placeholder:text-slate-400 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg mr-1 text-xs"
                >
                  Clear
                </button>
              )}
              <a
                href="#directory"
                className="btn-emerald text-sm font-semibold py-2.5 px-5 rounded-xl shrink-0 hidden sm:inline-flex"
              >
                Browse All
              </a>
            </div>
          </div>

          {/* Hero Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-10 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs text-center">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-display">
                {barangays.length}
              </p>
              <p className="text-xs text-slate-300 font-medium mt-1">Barangays Onboarded</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs text-center">
              <p className="text-2xl sm:text-3xl font-bold text-civic-gold font-display">100%</p>
              <p className="text-xs text-slate-300 font-medium mt-1">Public & Free Access</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs text-center">
              <p className="text-2xl sm:text-3xl font-bold text-sky-400 font-display">Real-Time</p>
              <p className="text-xs text-slate-300 font-medium mt-1">Financial Auditing</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs text-center">
              <p className="text-2xl sm:text-3xl font-bold text-purple-400 font-display">SK Hub</p>
              <p className="text-xs text-slate-300 font-medium mt-1">Youth Governance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Directory Section */}
      <section id="directory" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 flex-1 w-full">
        {/* Directory Controls Header */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-civic-navy font-display flex items-center gap-2">
                <Building2 className="w-6 h-6 text-civic-emerald" />
                Find Your Barangay Portal
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Select your barangay to review its published budget, ongoing community projects, and submit feedback.
              </p>
            </div>

            {/* Province Filter */}
            {provinces.length > 2 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Province:</span>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="input-field text-xs font-semibold text-slate-700 py-1.5 px-3 w-40"
                >
                  <option value="all">All Provinces</option>
                  {provinces.filter((p) => p !== 'all').map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <ErrorBanner message={error} />
        </div>

        {/* Loading Skeleton / State */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card p-6 animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="card text-center py-16 px-6 max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-civic-navy">No barangay found</h3>
              <p className="text-sm text-slate-500 mt-1">
                We couldn't find a portal matching <span className="font-semibold text-slate-700">"{search}"</span>.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/signup" className="btn-emerald text-xs inline-flex items-center gap-2">
                Register Your Barangay Today <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Barangay Directory Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="card p-6 flex flex-col justify-between hover:shadow-card-hover hover:border-civic-emerald/40 transition-all duration-200 group bg-white border border-slate-200"
            >
              <div className="space-y-4">
                {/* Header with Logo */}
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:border-civic-emerald transition-colors">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display font-bold text-xl text-civic-navy">
                        {b.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        Active Portal
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-lg text-civic-navy truncate group-hover:text-civic-leaf transition-colors mt-0.5">
                      {b.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {[b.municipality, b.province].filter(Boolean).join(', ') || 'Philippines'}
                    </p>
                  </div>
                </div>

                {/* Quick Portal Navigation Links */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-center">
                  <Link
                    to={`/b/${b.slug}/budget`}
                    className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 text-[11px] font-semibold transition-colors flex flex-col items-center gap-1"
                  >
                    <PieChart className="w-3.5 h-3.5 text-civic-emerald" />
                    <span>Budget</span>
                  </Link>

                  <Link
                    to={`/b/${b.slug}/programs`}
                    className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-800 text-[11px] font-semibold transition-colors flex flex-col items-center gap-1"
                  >
                    <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                    <span>Programs</span>
                  </Link>

                  <Link
                    to={`/b/${b.slug}/feedback`}
                    className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-800 text-[11px] font-semibold transition-colors flex flex-col items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                    <span>Feedback</span>
                  </Link>
                </div>
              </div>

              {/* Main Enter Portal Button */}
              <Link
                to={`/b/${b.slug}`}
                className="btn-primary mt-5 w-full flex items-center justify-between text-xs py-2.5 font-semibold group/btn"
              >
                <span>Enter Public Portal</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Core Transparency Pillars Section */}
      <section id="pillars" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-civic-leaf uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Open Governance Pillars
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-civic-navy">
              Built for Community Trust & Accountability
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Every barangay transaction and program is held to the highest standard of public transparency,
              fostering active civic participation across every sector.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-civic-emerald" />
              </div>
              <h3 className="font-bold text-lg text-civic-navy">Financial Transparency</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Clear breakdown of IRA shares, local revenue, and itemized expenses with attached receipt documentation.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <HeartHandshake className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-civic-navy">Categorized Beneficiaries</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Track community programs serving Senior Citizens, PWDs, Solo Parents, Youth, and indigent 4Ps families.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg text-civic-navy">Direct Citizen Voice</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Submit community suggestions, inquiries, or reports directly to council officials with photo verification.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="font-bold text-lg text-civic-navy">SK Youth Empowerment</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Dedicated portal for Sangguniang Kabataan allocations, youth sports programs, and Katipunan ng Kabataan monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-display font-bold text-civic-navy">How The System Works</h2>
            <p className="text-slate-600 text-sm">A unified platform serving both everyday residents and local council officials.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* For Residents */}
            <div className="card p-8 space-y-6 border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-lg text-civic-navy">For Residents & Citizens</h3>
                  <p className="text-xs text-slate-500">No account or login required</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Search your barangay:</strong> Access your specific community's public URL (e.g. <code>/b/your-barangay</code>).</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Audit public funds:</strong> Examine budget allocations, incoming fund sources, and actual expenses in real-time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Send feedback:</strong> Submit concerns, commendations, or photos directly to your officials without bureaucracy.</span>
                </li>
              </ul>
            </div>

            {/* For Officials */}
            <div className="card p-8 space-y-6 border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-civic-navy text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-lg text-civic-navy">For Barangay & SK Officials</h3>
                  <p className="text-xs text-slate-500">Role-gated administrative suite</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-civic-navy shrink-0 mt-0.5" />
                  <span><strong>Secure onboarding:</strong> Register your barangay in under 3 minutes with role-based permissions (Captain, Secretary, Treasurer, SK).</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-civic-navy shrink-0 mt-0.5" />
                  <span><strong>Publish records:</strong> Maintain verified logs of programs, categorized beneficiaries, expenses, and election transition handovers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-civic-navy shrink-0 mt-0.5" />
                  <span><strong>AI Assistant:</strong> Leverage Groq AI to draft council resolutions, accomplishment reports, and budget forecasts instantly.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Official Call-to-Action Banner */}
      <section className="bg-civic-navy text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
            Ready to Bring Open Transparency to Your Barangay?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Join barangays modernizing their public communication and financial accountability with our free, multi-tenant portal.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/signup" className="btn-emerald px-6 py-3 text-base font-semibold shadow-md hover:scale-105 transition-transform">
              Register New Barangay
            </Link>
            <Link to="/login" className="btn-secondary bg-white/10 hover:bg-white/20 text-white border-white/20 px-6 py-3 text-base font-semibold">
              Official Portal Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Civic Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-civic-navy text-civic-gold flex items-center justify-center border border-white/10">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Barangay Transparency Portal</p>
                <p className="text-[11px] text-slate-500">Republic of the Philippines · Local Government Support System</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-slate-400">
              <a href="#directory" className="hover:text-white transition-colors">Directory</a>
              <a href="#pillars" className="hover:text-white transition-colors">Pillars</a>
              <Link to="/login" className="hover:text-white transition-colors">Official Login</Link>
              <Link to="/signup" className="hover:text-white transition-colors">Register Barangay</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-500">
            <p>
              © {new Date().getFullYear()} Barangay Transparency System. Developed for civic transparency and community development.
            </p>
            <p className="flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full compliance with Republic Act No. 7160</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

