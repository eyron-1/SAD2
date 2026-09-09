import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PublicLayout from './components/layout/PublicLayout';
import OfficialLayout from './components/layout/OfficialLayout';

const Landing = lazy(() => import('./pages/public/Landing'));
const PublicOverview = lazy(() => import('./pages/public/PublicOverview'));
const PublicBudget = lazy(() => import('./pages/public/PublicBudget'));
const PublicPrograms = lazy(() => import('./pages/public/PublicPrograms'));
const PublicSKOverview = lazy(() => import('./pages/public/PublicSKOverview'));
const PublicSKBudget = lazy(() => import('./pages/public/PublicSKBudget'));
const PublicSKPrograms = lazy(() => import('./pages/public/PublicSKPrograms'));
const PublicOfficials = lazy(() => import('./pages/public/PublicOfficials'));
const FeedbackForm = lazy(() => import('./pages/public/FeedbackForm'));

const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));

const Dashboard = lazy(() => import('./pages/official/Dashboard'));
const BudgetManagement = lazy(() => import('./pages/official/BudgetManagement'));
const ExpenseManagement = lazy(() => import('./pages/official/ExpenseManagement'));
const FundSourcing = lazy(() => import('./pages/official/FundSourcing'));
const ProgramManagement = lazy(() => import('./pages/official/ProgramManagement'));
const FeedbackManagement = lazy(() => import('./pages/official/FeedbackManagement'));
const OfficialsTransition = lazy(() => import('./pages/official/OfficialsTransition'));
const ReportsAnalytics = lazy(() => import('./pages/official/ReportsAnalytics'));
const AIAssistant = lazy(() => import('./pages/official/AIAssistant'));
const BarangaySettings = lazy(() => import('./pages/official/BarangaySettings'));

const SKDashboard = lazy(() => import('./pages/sk/SKDashboard'));
const SKBudget = lazy(() => import('./pages/sk/SKBudget'));
const SKPrograms = lazy(() => import('./pages/sk/SKPrograms'));
const SKFundSourcing = lazy(() => import('./pages/sk/SKFundSourcing'));
const SKExpenseManagement = lazy(() => import('./pages/sk/SKExpenseManagement'));
const SKFeedback = lazy(() => import('./pages/sk/SKFeedback'));
const KKMonitoring = lazy(() => import('./pages/sk/KKMonitoring'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen bg-civic-cream" />}>
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
            <Route path="kk-monitoring" element={<KKMonitoring />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="settings" element={<BarangaySettings />} />
          </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
