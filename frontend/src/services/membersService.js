import api from './api';

export async function fetchMembers(params) {
  const { data } = await api.get('/members', { params });
  return data.data;
}

export async function fetchMember(id) {
  const { data } = await api.get(`/members/${id}`);
  return data.data.member;
}

export async function createMember(payload) {
  const { data } = await api.post('/members', payload);
  return data.data.member;
}

export async function updateMember(id, payload) {
  const { data } = await api.put(`/members/${id}`, payload);
  return data.data.member;
}

export async function deleteMember(id) {
  const { data } = await api.delete(`/members/${id}`);
  return data;
}
