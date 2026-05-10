import api from './api';

export async function fetchAttendance(params) {
  const { data } = await api.get('/attendance', { params });
  return data.data;
}

export async function checkInAttendance(payload) {
  const { data } = await api.post('/attendance/check-in', payload);
  return data.data;
}

export async function checkOutAttendance(payload) {
  const { data } = await api.post('/attendance/check-out', payload);
  return data.data;
}
