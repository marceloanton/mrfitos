import api from './api';

export async function fetchExpirations(days = 3) {
  const { data } = await api.get('/reminders/expirations', { params: { days } });
  return data.data;
}

export async function buildReminderBatch(payload) {
  const { data } = await api.post('/reminders/batch', payload);
  return data.data;
}

export async function fetchReminderBatches() {
  const { data } = await api.get('/reminders/batches');
  return data.data.items;
}

export async function fetchReminderBatchItems(batchId) {
  const { data } = await api.get(`/reminders/batches/${batchId}/items`);
  return data.data.items;
}

export async function updateReminderBatchItemStatus(batchId, itemId, payload) {
  const { data } = await api.patch(`/reminders/batches/${batchId}/items/${itemId}`, payload);
  return data;
}
