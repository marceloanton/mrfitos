import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function PermissionRoute({ permission }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
