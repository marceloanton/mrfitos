import api from './api';

export async function trackEvent(eventName, context = null, metadata = {}) {
  if (!eventName) return;
  try {
    await api.post('/tracking/events', {
      event_name: String(eventName),
      context: context ? String(context) : null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    });
  } catch {
    // Tracking must never block core user flows.
  }
}
