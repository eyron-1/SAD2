import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSkRole } from '../../utils/roles';
import { ShieldAlert, LogOut, UserPlus } from 'lucide-react';

// scope: 'official' | 'sk' | 'any' — restricts by which dashboard the role belongs to
export default function ProtectedRoute({ children, scope = 'any' }) {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-civic-emerald border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Verifying official credentials…</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="card max-w-md w-full p-6 text-center space-y-4 shadow-card">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-civic-navy">Official Profile Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You are signed in as <span className="font-semibold text-slate-700">{session.user?.email}</span>, but no active barangay official profile was found for this user ID.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Link to="/signup" className="btn-emerald text-xs flex items-center justify-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Complete Registration
            </Link>
            <button
              onClick={() => signOut()}
              className="btn-secondary text-xs flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const skMember = isSkRole(profile.role);
  if (scope === 'sk' && !skMember) return <Navigate to="/dashboard" replace />;
  if (scope === 'official' && skMember) return <Navigate to="/sk" replace />;

  return children;
}
