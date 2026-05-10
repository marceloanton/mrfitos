import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function PermissionRoute({ permission, permissions = [] }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const allowed =
    (typeof permission === 'string' && permission.length > 0 && hasPermission(permission)) ||
    (Array.isArray(permissions) && permissions.some((p) => hasPermission(p)));
  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
