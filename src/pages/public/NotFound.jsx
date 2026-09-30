import { Link, useNavigate } from 'react-router-dom';
import { Landmark, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-body">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-card border border-slate-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-civic-emerald flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
          <Landmark className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-extrabold text-civic-navy tracking-tight">404</span>
          <h1 className="text-xl font-bold text-slate-800">Page Not Found</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            The page or transparency record you are looking for doesn't exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <Link
            to="/"
            className="btn-emerald text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Home Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
