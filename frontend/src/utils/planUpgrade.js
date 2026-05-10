const PLAN_LIMIT_ENDPOINTS = ['/members', '/payments', '/attendance', '/pos/sales', '/reminders/batch', '/reports/renewals'];

function matchesPlanLimitEndpoint(url = '') {
  return PLAN_LIMIT_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

export function getPlanUpgradeInfo(error) {
  const status = error?.response?.status;
  const requestUrl = String(error?.config?.url ?? '');

  if (status !== 402 || !matchesPlanLimitEndpoint(requestUrl)) {
    return null;
  }

  return {
    title: 'Límite de plan alcanzado',
    message:
      error?.response?.data?.message ??
      'Tu plan actual alcanzó su límite para esta operación. Actualizá el plan para continuar.'
  };
}
