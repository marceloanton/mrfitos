import api from './api';

export async function fetchMemberships(params) {
  const { data } = await api.get('/memberships', { params });
  return data.data;
}

export async function createMembership(payload) {
  const { data } = await api.post('/memberships', payload);
  return data.data.membership;
}

export async function updateMembership(id, payload) {
  const { data } = await api.put(`/memberships/${id}`, payload);
  return data.data.membership;
}

export async function deleteMembership(id) {
  const { data } = await api.delete(`/memberships/${id}`);
  return data;
}
