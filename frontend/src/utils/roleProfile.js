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

