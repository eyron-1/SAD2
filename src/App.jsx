import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import PublicLayout from "./components/layout/PublicLayout";
import OfficialLayout from "./components/layout/OfficialLayout";
import ErrorBanner from "./components/ui/ErrorBanner";
import { friendlySupabaseError } from "./lib/validation";

class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="card max-w-lg space-y-4 text-center">
            <h1 className="text-xl font-bold text-civic-navy">
              This page could not be displayed
            </h1>
            <p className="text-sm text-slate-600">
              An unexpected error stopped this page from loading. Reload the
              page and try again.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Reload page
              </button>
              <a href="/" className="btn-secondary">
                Return to home
              </a>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function OfficialSessionExitHandler() {
  const location = useLocation();
  const { signOut } = useAuth();
  const previousPath = useRef(location.pathname);
  const [error, setError] = useState("");

  useEffect(() => {
    const wasInOfficialPortal = /^\/(dashboard|sk)(\/|$)/.test(
      previousPath.current,
    );
    const isInOfficialPortal = /^\/(dashboard|sk)(\/|$)/.test(
      location.pathname,
    );
    previousPath.current = location.pathname;

    if (!wasInOfficialPortal || isInOfficialPortal) return undefined;

    let active = true;
    signOut()
      .then(() => {
        if (active) setError("");
      })
      .catch((signOutError) => {
        if (active) setError(friendlySupabaseError(signOutError));
      });

    return () => {
      active = false;
    };
  }, [location.pathname, signOut]);

  const retrySignOut = async () => {
    try {
      await signOut();
      setError("");
    } catch (signOutError) {
      setError(friendlySupabaseError(signOutError));
    }
  };

  return error ? (
    <div className="fixed top-4 left-1/2 z-[100] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2">
      <ErrorBanner message={error} onRetry={retrySignOut} />
    </div>
  ) : null;
}

const Landing = lazy(() => import("./pages/public/Landing"));
const PublicOverview = lazy(() => import("./pages/public/PublicOverview"));
const PublicBudget = lazy(() => import("./pages/public/PublicBudget"));
const PublicPrograms = lazy(() => import("./pages/public/PublicPrograms"));
const PublicSKOverview = lazy(() => import("./pages/public/PublicSKOverview"));
const PublicSKBudget = lazy(() => import("./pages/public/PublicSKBudget"));
const PublicSKPrograms = lazy(() => import("./pages/public/PublicSKPrograms"));
const KKProfilingForm = lazy(() => import("./pages/public/KKProfilingForm"));
const PublicOfficials = lazy(() => import("./pages/public/PublicOfficials"));
const FeedbackForm = lazy(() => import("./pages/public/FeedbackForm"));
const NotFound = lazy(() => import("./pages/public/NotFound"));

const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));

const Dashboard = lazy(() => import("./pages/official/Dashboard"));
const BudgetManagement = lazy(
  () => import("./pages/official/BudgetManagement"),
);
const ExpenseManagement = lazy(
  () => import("./pages/official/ExpenseManagement"),
);
const FundSourcing = lazy(() => import("./pages/official/FundSourcing"));
const ProgramManagement = lazy(
  () => import("./pages/official/ProgramManagement"),
);
const FeedbackManagement = lazy(
  () => import("./pages/official/FeedbackManagement"),
);
const OfficialsTransition = lazy(
  () => import("./pages/official/OfficialsTransition"),
);
const ReportsAnalytics = lazy(
  () => import("./pages/official/ReportsAnalytics"),
);
const OperationsCenter = lazy(
  () => import("./pages/official/OperationsCenter"),
);
const AIAssistant = lazy(() => import("./pages/official/AIAssistant"));
const BarangaySettings = lazy(
  () => import("./pages/official/BarangaySettings"),
);

const SKDashboard = lazy(() => import("./pages/sk/SKDashboard"));
const SKBudget = lazy(() => import("./pages/sk/SKBudget"));
const SKPrograms = lazy(() => import("./pages/sk/SKPrograms"));
const SKFundSourcing = lazy(() => import("./pages/sk/SKFundSourcing"));
const SKExpenseManagement = lazy(
  () => import("./pages/sk/SKExpenseManagement"),
);
const SKFeedback = lazy(() => import("./pages/sk/SKFeedback"));
const KKMonitoring = lazy(() => import("./pages/sk/KKMonitoring"));
const SKOperationsCenter = lazy(() => import("./pages/sk/SKOperationsCenter"));

export default function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <OfficialSessionExitHandler />
        <AppErrorBoundary>
          <Suspense
            fallback={
              <main className="min-h-screen flex items-center justify-center bg-civic-cream">
                <div className="flex flex-col items-center gap-3 text-civic-navy">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-civic-emerald border-t-transparent" />
                  <p className="text-sm font-medium">Loading page…</p>
                </div>
              </main>
            }
          >
            <Routes>
            {/* Public / resident-facing — no login required */}
            <Route path="/" element={<Landing />} />
            <Route path="/b/:slug" element={<PublicLayout />}>
              <Route index element={<PublicOverview />} />
              <Route path="budget" element={<PublicBudget />} />
              <Route path="programs" element={<PublicPrograms />} />
              <Route path="officials" element={<PublicOfficials />} />
              <Route path="feedback" element={<FeedbackForm />} />
              <Route path="sk" element={<Outlet />}>
                <Route index element={<PublicSKOverview />} />
                <Route path="budget" element={<PublicSKBudget />} />
                <Route path="programs" element={<PublicSKPrograms />} />
                <Route path="profiling" element={<KKProfilingForm />} />
                <Route path="feedback" element={<FeedbackForm />} />
              </Route>
            </Route>

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Barangay officials (captain, secretary, treasurer, kagawad, staff) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute scope="official">
                  <OfficialLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="budget" element={<BudgetManagement />} />
              <Route path="expenses" element={<ExpenseManagement />} />
              <Route path="funds" element={<FundSourcing />} />
              <Route path="programs" element={<ProgramManagement />} />
              <Route path="feedback" element={<FeedbackManagement />} />
              <Route path="officials" element={<OfficialsTransition />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="operations" element={<OperationsCenter />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
              <Route path="settings" element={<BarangaySettings />} />
            </Route>

            {/* SK officials (chairperson, treasurer, kagawad) */}
            <Route
              path="/sk"
              element={
                <ProtectedRoute scope="sk">
                  <OfficialLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<SKDashboard />} />
              <Route path="budget" element={<SKBudget />} />
              <Route path="programs" element={<SKPrograms />} />
              <Route path="funds" element={<SKFundSourcing />} />
              <Route path="expenses" element={<SKExpenseManagement />} />
              <Route path="feedback" element={<SKFeedback />} />
              <Route path="officials" element={<OfficialsTransition />} />
              <Route path="kk-monitoring" element={<KKMonitoring />} />
              <Route path="operations" element={<SKOperationsCenter />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
              <Route path="settings" element={<BarangaySettings />} />
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
