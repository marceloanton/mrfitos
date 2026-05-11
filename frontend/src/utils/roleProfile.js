export function inferHudRole(permissions = []) {
  const has = (permission) => Array.isArray(permissions) && permissions.includes(permission);
  if (has('subscriptions.manage') || has('reports.read')) {
    return { code: 'manager', label: 'Gerente' };
  }
  if (has('attendance.write') || has('members.write') || has('payments.write')) {
    return { code: 'reception', label: 'Recepción' };
  }
  return { code: 'operator', label: 'Operador' };
}

export function isManagementProfile(permissions = []) {
  const role = inferHudRole(permissions);
  return role.code === 'manager';
}

export function resolveHudRole(user = null) {
  const profile = user?.role_profile;
  if (profile && typeof profile.code === 'string' && typeof profile.label === 'string') {
    return {
      code: profile.code,
      label: profile.label
    };
  }
  return inferHudRole(user?.permissions ?? []);
}

export function resolveManagementFlag(user = null) {
  const profile = user?.role_profile;
  if (typeof profile?.is_management === 'boolean') {
    return profile.is_management;
  }
  return isManagementProfile(user?.permissions ?? []);
}
