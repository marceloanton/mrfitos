import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import AttendancePage from '../pages/AttendancePage';
import LoginPage from '../pages/LoginPage';
import MembersPage from '../pages/MembersPage';
import MembershipsPage from '../pages/MembershipsPage';
import PaymentsPage from '../pages/PaymentsPage';
import PosPage from '../pages/PosPage';
import PlansPage from '../pages/PlansPage';
import RemindersPage from '../pages/RemindersPage';
import ReportsPage from '../pages/ReportsPage';
import AdminSubscriptionPage from '../pages/AdminSubscriptionPage';
import AdminBillingPage from '../pages/AdminBillingPage';
import AdminModulesPage from '../pages/AdminModulesPage';
import PricingPage from '../pages/PricingPage';
import SelfServiceUpgradePage from '../pages/SelfServiceUpgradePage';
import BillingSuccessPage from '../pages/BillingSuccessPage';
import BillingFailurePage from '../pages/BillingFailurePage';
import BillingPendingPage from '../pages/BillingPendingPage';
import OperationalGuidePage from '../pages/OperationalGuidePage';
import PermissionRoute from './PermissionRoute';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/billing/success" element={<BillingSuccessPage />} />
      <Route path="/billing/failure" element={<BillingFailurePage />} />
      <Route path="/billing/pending" element={<BillingPendingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<PermissionRoute permission="dashboard.read" />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route element={<PermissionRoute permission="members.read" />}>
            <Route path="/members" element={<MembersPage />} />
          </Route>
          <Route element={<PermissionRoute permission="plans.read" />}>
            <Route path="/plans" element={<PlansPage />} />
          </Route>
          <Route element={<PermissionRoute permission="memberships.read" />}>
            <Route path="/memberships" element={<MembershipsPage />} />
          </Route>
          <Route element={<PermissionRoute permissions={['pos.read', 'payments.read']} />}>
            <Route path="/pos" element={<PosPage />} />
            <Route path="/pos/caja" element={<PosPage />} />
            <Route path="/pos/ventas" element={<PosPage />} />
            <Route path="/pos/productos" element={<PosPage />} />
            <Route path="/pos/control" element={<PosPage />} />
          </Route>
          <Route element={<PermissionRoute permission="payments.read" />}>
            <Route path="/payments" element={<PaymentsPage />} />
          </Route>
          <Route element={<PermissionRoute permission="attendance.read" />}>
            <Route path="/attendance" element={<AttendancePage />} />
          </Route>
          <Route element={<PermissionRoute permission="whatsapp.read" />}>
            <Route path="/reminders" element={<RemindersPage />} />
          </Route>
          <Route element={<PermissionRoute permission="reports.read" />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route path="/operational-guide" element={<OperationalGuidePage />} />
          <Route element={<PermissionRoute permission="subscriptions.manage" />}>
            <Route path="/admin/subscription" element={<AdminSubscriptionPage />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptionPage />} />
            <Route path="/admin/billing" element={<AdminBillingPage />} />
          </Route>
          <Route element={<PermissionRoute permission="subscriptions.manage.catalog" />}>
            <Route path="/admin/modules" element={<AdminModulesPage />} />
          </Route>
          <Route path="/billing/self-service" element={<SelfServiceUpgradePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
