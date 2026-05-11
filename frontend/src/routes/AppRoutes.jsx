import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import PermissionRoute from './PermissionRoute';
import ProtectedRoute from './ProtectedRoute';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AttendancePage = lazy(() => import('../pages/AttendancePage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const MembersPage = lazy(() => import('../pages/MembersPage'));
const MembershipsPage = lazy(() => import('../pages/MembershipsPage'));
const PaymentsPage = lazy(() => import('../pages/PaymentsPage'));
const PosPage = lazy(() => import('../pages/PosPage'));
const PosHomePage = lazy(() => import('../pages/PosHomePage'));
const PlansPage = lazy(() => import('../pages/PlansPage'));
const RemindersPage = lazy(() => import('../pages/RemindersPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const AdminSubscriptionPage = lazy(() => import('../pages/AdminSubscriptionPage'));
const AdminBillingPage = lazy(() => import('../pages/AdminBillingPage'));
const AdminModulesPage = lazy(() => import('../pages/AdminModulesPage'));
const PricingPage = lazy(() => import('../pages/PricingPage'));
const SelfServiceUpgradePage = lazy(() => import('../pages/SelfServiceUpgradePage'));
const BillingSuccessPage = lazy(() => import('../pages/BillingSuccessPage'));
const BillingFailurePage = lazy(() => import('../pages/BillingFailurePage'));
const BillingPendingPage = lazy(() => import('../pages/BillingPendingPage'));
const OperationalGuidePage = lazy(() => import('../pages/OperationalGuidePage'));

function RouteLoader() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
      Cargando módulo...
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
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
              <Route path="/pos" element={<PosHomePage />} />
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
    </Suspense>
  );
}
