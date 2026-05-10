import api from './api';

export async function fetchPlans(params) {
  const { data } = await api.get('/plans', { params });
  return data.data;
}

export async function createPlan(payload) {
  const { data } = await api.post('/plans', payload);
  return data.data.plan;
}

export async function updatePlan(id, payload) {
  const { data } = await api.put(`/plans/${id}`, payload);
  return data.data.plan;
}

export async function deletePlan(id) {
  const { data } = await api.delete(`/plans/${id}`);
  return data;
}
