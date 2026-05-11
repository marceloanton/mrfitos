import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function PermissionRoute({ permission, permissions = [], capability, capabilities = [] }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const user = useAuthStore((state) => state.user);
  const userCapabilities = user?.capabilities ?? {};
  const hasCapability = (cap) => typeof userCapabilities?.[cap] === 'boolean' && userCapabilities[cap] === true;
  const capabilityAllowed =
    (typeof capability === 'string' && capability.length > 0 && hasCapability(capability)) ||
    (Array.isArray(capabilities) && capabilities.some((cap) => hasCapability(cap)));
  const allowed =
    capabilityAllowed ||
    (typeof permission === 'string' && permission.length > 0 && hasPermission(permission)) ||
    (Array.isArray(permissions) && permissions.some((p) => hasPermission(p)));
  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
