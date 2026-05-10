import api from './api';

export async function fetchPayments(params) {
  const { data } = await api.get('/payments', { params });
  return data.data;
}

export async function createPayment(payload) {
  const { data } = await api.post('/payments', payload);
  return data.data.payment;
}

export async function updatePayment(id, payload) {
  const { data } = await api.put(`/payments/${id}`, payload);
  return data.data.payment;
}

export async function deletePayment(id) {
  const { data } = await api.delete(`/payments/${id}`);
  return data;
}
