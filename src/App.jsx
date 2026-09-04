import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PublicLayout from './components/layout/PublicLayout';
import OfficialLayout from './components/layout/OfficialLayout';

import Landing from './pages/public/Landing';
import PublicOverview from './pages/public/PublicOverview';
import PublicBudget from './pages/public/PublicBudget';
import PublicPrograms from './pages/public/PublicPrograms';
import PublicOfficials from './pages/public/PublicOfficials';
import FeedbackForm from './pages/public/FeedbackForm';

import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

import Dashboard from './pages/official/Dashboard';
import BudgetManagement from './pages/official/BudgetManagement';
import ExpenseManagement from './pages/official/ExpenseManagement';
import FundSourcing from './pages/official/FundSourcing';
import ProgramManagement from './pages/official/ProgramManagement';
import FeedbackManagement from './pages/official/FeedbackManagement';
import OfficialsTransition from './pages/official/OfficialsTransition';
import ReportsAnalytics from './pages/official/ReportsAnalytics';
import AIAssistant from './pages/official/AIAssistant';
import BarangaySettings from './pages/official/BarangaySettings';

import SKDashboard from './pages/sk/SKDashboard';
import SKBudget from './pages/sk/SKBudget';
import SKPrograms from './pages/sk/SKPrograms';
import KKMonitoring from './pages/sk/KKMonitoring';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public / resident-facing — no login required */}
          <Route path="/" element={<Landing />} />
          <Route path="/b/:slug" element={<PublicLayout />}>
            <Route index element={<PublicOverview />} />
            <Route path="budget" element={<PublicBudget />} />
            <Route path="programs" element={<PublicPrograms />} />
            <Route path="officials" element={<PublicOfficials />} />
            <Route path="feedback" element={<FeedbackForm />} />
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
            <Route path="kk-monitoring" element={<KKMonitoring />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="settings" element={<BarangaySettings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
