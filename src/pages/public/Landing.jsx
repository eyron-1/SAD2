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
  Building2,
  CheckCircle,
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4.5rem] py-3 flex items-center justify-between gap-4">
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
              <p className="text-[11px] text-slate-500 font-medium">Public information for stronger communities</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
            <a href="#directory" className="hover:text-civic-navy transition-colors">
              Find a Barangay
            </a>
            <a href="#pillars" className="hover:text-civic-navy transition-colors">
              What You Can Explore
            </a>
            <a href="#how-it-works" className="hover:text-civic-navy transition-colors">
              How It Works
            </a>
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-civic-navy px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Official Sign In
            </Link>
            <Link
              to="/signup"
              className="btn-emerald text-sm font-semibold py-2 px-4 shadow-sm hover:shadow-md"
            >
              Register a Barangay
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
            <a
              href="#directory"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-civic-navy"
            >
              Find a Barangay
            </a>
            <a
              href="#pillars"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-civic-navy"
            >
              What You Can Explore
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
                Official Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold text-white bg-civic-leaf rounded-lg"
              >
                Register a Barangay
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-civic-navy via-slate-900 to-sky-950 text-white py-14 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(201,162,75,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(47,107,79,0.18),transparent_28%)]" />
        <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-civic-gold/10 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-civic-gold text-xs font-semibold text-center backdrop-blur-sm shadow-glass">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Supporting the DILG Full Disclosure Policy and the Local Government Code (RA 7160)</span>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white tracking-tight leading-[1.08] max-w-4xl mx-auto font-bold">
              Building Trust Through Transparent Governance. 
            </h1>

            <p className="text-base sm:text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed">
                Access public budgets, discover local programs, and stay informed about your community.
            </p>
          </div>

          <div className="pt-1 max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white/95 backdrop-blur-sm rounded-2xl p-2 shadow-card-hover border border-white/20 text-slate-800 focus-within:ring-4 focus-within:ring-emerald-300/40">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                aria-label="Search barangays"
                placeholder="Search by barangay, municipality, or province"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-w-0 px-3 py-3 text-sm sm:text-base outline-none bg-transparent placeholder:text-slate-400 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear barangay search"
                  className="shrink-0 p-2 text-slate-500 hover:text-slate-700 rounded-lg mr-1 text-xs font-semibold transition-colors"
                >
                  Clear
                </button>
              )}
              <a
                href="#directory"
                className="btn-emerald text-sm font-semibold py-2.5 px-4 rounded-xl shrink-0 hidden sm:inline-flex"
              >
                Browse All
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-2 sm:pt-4 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm text-center shadow-glass">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-300 font-display">
                {loading ? '—' : barangays.length}
              </p>
              <p className="text-xs text-slate-300 font-medium mt-1">Barangay portals</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm text-center shadow-glass">
              <p className="text-2xl sm:text-3xl font-bold text-civic-gold font-display">24/7</p>
              <p className="text-xs text-slate-300 font-medium mt-1">Available anytime</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm text-center shadow-glass">
              <p className="text-2xl sm:text-3xl font-bold text-sky-300 font-display">Open</p>
              <p className="text-xs text-slate-300 font-medium mt-1">Published records</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm text-center shadow-glass">
              <p className="text-2xl sm:text-3xl font-bold text-civic-gold font-display">SK</p>
              <p className="text-xs text-slate-300 font-medium mt-1">SK information</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Directory Section */}
      <section id="directory" className="scroll-mt-28 py-12 sm:py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 flex-1 w-full">
        {/* Directory Controls Header */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-card-hover border border-slate-200 p-5 sm:p-7 mb-7 sm:mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 mb-3 text-[10px] font-bold uppercase tracking-[0.16em]">
                <Building2 className="w-3.5 h-3.5" />
                Community Directory
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-civic-navy font-display flex items-center gap-2">
                <Building2 className="w-6 h-6 text-civic-emerald shrink-0" />
                Find your barangay
              </h2>
              <p className="text-slate-600 text-sm mt-2 max-w-2xl leading-relaxed">
                Browse a portal to explore published budgets, community programs, local officials, and ways to share feedback.
              </p>
            </div>

            {/* Province Filter */}
            {provinces.length > 2 && (
              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="province-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Province</label>
                <select
                  id="province-filter"
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="input-field text-xs font-semibold text-slate-700 py-2 px-3 w-40"
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
          <div role="status" aria-label="Loading barangay portals" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
        {!loading && !error && filtered.length === 0 && (
          <div className="card text-center py-12 sm:py-16 px-5 sm:px-6 max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-civic-navy">No matching barangay portals</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Try another search or change the province filter. If your barangay is not listed, an official can register its portal.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {(search || selectedProvince !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedProvince('all');
                  }}
                  className="btn-secondary text-xs"
                >
                  Clear filters
                </button>
              )}
              <Link to="/signup" className="btn-emerald text-xs inline-flex items-center gap-2">
                Register a barangay <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Barangay Directory Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((b) => (
              <div
              key={b.id}
              className="card p-6 flex flex-col justify-between hover:shadow-card-hover hover:-translate-y-1 hover:border-civic-emerald/40 transition-all duration-200 group bg-white border border-slate-200 rounded-2xl"
            >
              <div className="space-y-4">
                {/* Header with Logo */}
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:border-civic-emerald transition-colors">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display font-bold text-xl text-civic-navy">
                        {b.name?.charAt(0) || <Building2 className="w-6 h-6" />}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        Public portal
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
                    className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-civic-navy text-[11px] font-semibold transition-colors flex flex-col items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-civic-navy" />
                    <span>Feedback</span>
                  </Link>
                </div>
              </div>

              {/* Main Enter Portal Button */}
              <Link
                to={`/b/${b.slug}`}
                className="btn-primary mt-5 w-full flex items-center justify-between text-xs py-2.5 font-semibold group/btn"
              >
                <span>Visit public portal</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Core Transparency Pillars Section */}
      <section id="pillars" className="scroll-mt-24 py-14 sm:py-16 lg:py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-4">
            <span className="text-xs font-bold text-civic-leaf uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              What You Can Explore
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-civic-navy">
              Useful information for your community
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Explore the information barangays and Sangguniang Kabataan offices publish, and find ways to take part in community life.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Pillar 1 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-civic-emerald" />
              </div>
              <h3 className="font-bold text-lg text-civic-navy">Budgets and expenses</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Review published budgets, sources of funds, and recorded expenses.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <HeartHandshake className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-civic-navy">Programs and services</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Learn about local programs, projects, and the community members they serve.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-slate-200 text-civic-navy flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-civic-navy" />
              </div>
              <h3 className="font-bold text-lg text-civic-navy">Resident feedback</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Send questions, suggestions, or concerns to your barangay through its public portal.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="font-bold text-lg text-civic-navy">Youth programs</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Explore Sangguniang Kabataan budgets, programs, and community updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="scroll-mt-24 py-14 sm:py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-civic-navy">How it works</h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">Residents can browse public information, while barangay officials manage what appears on their portal.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
            {/* For Residents */}
            <div className="card p-5 sm:p-7 space-y-5 border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-lg text-civic-navy">For residents</h3>
                  <p className="text-xs text-slate-500">Browse public information without signing in</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Find your barangay:</strong> Search the directory and open its public portal.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Explore published information:</strong> Review budgets, recorded expenses, programs, and projects.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Share feedback:</strong> Send a question, suggestion, or concern through the public feedback form.</span>
                </li>
              </ul>
            </div>

            {/* For Officials */}
            <div className="card p-5 sm:p-7 space-y-5 border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-civic-navy text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-lg text-civic-navy">For barangay and SK officials</h3>
                  <p className="text-xs text-slate-500">Sign in to manage your barangay portal</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-civic-navy shrink-0 mt-0.5" />
                  <span><strong>Set up your portal:</strong> Register your barangay and provide the details residents need to find it.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-civic-navy shrink-0 mt-0.5" />
                  <span><strong>Manage information:</strong> Keep budget, expense, program, and community information up to date.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-civic-navy shrink-0 mt-0.5" />
                  <span><strong>Respond to residents:</strong> Review and manage feedback submitted through your public portal.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Official Call-to-Action Banner */}
      <section className="bg-civic-navy text-white py-14 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
            Bring your barangay’s information together
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Create a public place for residents to find local updates, published records, and ways to get in touch.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-1">
            <Link to="/signup" className="btn-emerald px-6 py-3 text-base font-semibold shadow-md hover:scale-105 transition-transform">
              Register a Barangay
            </Link>
            <Link to="/login" className="btn-secondary bg-white/10 hover:bg-white/20 text-white border-white/20 px-6 py-3 text-base font-semibold">
              Official Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Civic Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-civic-navy text-civic-gold flex items-center justify-center border border-white/10">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Barangay Transparency Portal</p>
                <p className="text-[11px] text-slate-500">A digital platform for local transparency and community engagement</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-slate-400">
              <a href="#directory" className="hover:text-white transition-colors">Directory</a>
              <a href="#pillars" className="hover:text-white transition-colors">What You Can Explore</a>
              <Link to="/login" className="hover:text-white transition-colors">Official Sign In</Link>
              <Link to="/signup" className="hover:text-white transition-colors">Register a Barangay</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-500">
            <p>
              © {new Date().getFullYear()} Barangay Transparency Portal. Supporting informed and engaged communities.
            </p>
            <p className="flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supporting transparent local governance</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
